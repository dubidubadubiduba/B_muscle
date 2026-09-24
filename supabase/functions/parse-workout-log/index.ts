const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
const GEMINI_MODEL = Deno.env.get('GEMINI_MODEL') || 'gemini-3.6-flash';
const QUOTA_EXCEEDED_MESSAGE = '사용량이 넘어가서 현재 이용할 수 없습니다. 잠시 후 다시 시도해주세요.';
const OVERLOADED_MESSAGE = '지금 요청이 몰려서 분석에 실패했어요. 잠시 후 다시 시도해주세요.';
const MAX_ATTEMPTS = 5;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    workouts: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          date: { type: 'STRING', description: 'YYYY-MM-DD' },
          bodyPart: { type: 'STRING', nullable: true },
          estimatedCalories: { type: 'NUMBER', nullable: true },
          exercises: {
            type: 'ARRAY',
            items: {
              type: 'OBJECT',
              properties: {
                name: { type: 'STRING' },
                sets: {
                  type: 'ARRAY',
                  items: {
                    type: 'OBJECT',
                    properties: {
                      weightKg: { type: 'NUMBER', nullable: true },
                      reps: { type: 'NUMBER', nullable: true },
                      setType: { type: 'STRING', enum: ['normal', 'drop', 'assisted'] },
                      holdSeconds: { type: 'NUMBER', nullable: true },
                    },
                    required: ['setType'],
                  },
                },
              },
              required: ['name', 'sets'],
            },
          },
        },
        required: ['date', 'exercises'],
      },
    },
  },
  required: ['workouts'],
};

const SYSTEM_PROMPT =
  '당신은 한국어로 손으로 적은 운동 일지를 구조화된 데이터로 변환하는 도우미입니다' + '\n' +
  '규칙' + '\n' +
  '각 세트마다 무게(weightKg)와 횟수(reps)를 반드시 원문에서 찾아서 채웁니다 예시 60kg 10회 3세트 는 weightKg 60 reps 10 인 set을 3개 만듭니다' + '\n' +
  '무게 단위가 kg로 명시되지 않아도 숫자+회 앞에 오는 숫자는 무게로 간주합니다' + '\n' +
  '드롭세트 표기 예시 35kg 30회 플러스 25kg 20회 드롭 2세트 는 각 무게를 별도의 set으로 나누고 setType을 drop으로 표시합니다' + '\n' +
  '보조 중량 보조 친딥 예시 42kg 보조 는 setType을 assisted로 표시합니다' + '\n' +
  '등척성 홀드 예시 10초 정지 홀드 는 holdSeconds에 초 단위 숫자를 채웁니다 없으면 null' + '\n' +
  '일반 세트는 setType normal' + '\n' +
  '날짜가 명시되어 있지 않은 항목은 건너뜁니다' + '\n' +
  'weightKg와 reps는 원문에 명시된 값만 사용하고 지어내지 않습니다 원문에 아예 없으면 null로 둡니다' + '\n' +
  'estimatedCalories는 예외입니다 원문에 칼로리가 적혀있으면 그 값을 쓰고 없으면 종목 세트 횟수 무게를 근거로 근력 운동 기준 합리적인 칼로리 소모량을 직접 계산해서 정수로 채웁니다 절대 null로 두지 않습니다';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (!GEMINI_API_KEY) {
    return new Response(JSON.stringify({ error: 'GEMINI_API_KEY is not configured' }), {
      status: 500,
      headers: Object.assign({}, corsHeaders, { 'Content-Type': 'application/json' }),
    });
  }

  try {
    const body = await req.json();
    const text = body.text;
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return new Response(JSON.stringify({ error: 'text is required' }), {
        status: 400,
        headers: Object.assign({}, corsHeaders, { 'Content-Type': 'application/json' }),
      });
    }

    const url =
      'https://generativelanguage.googleapis.com/v1beta/models/' +
      GEMINI_MODEL +
      ':generateContent?key=' +
      GEMINI_API_KEY;

    let response: Response | null = null;
    let errorText = '';
    let errorStatus = '';

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
      response = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
          contents: [{ parts: [{ text }] }],
          generationConfig: {
            response_mime_type: 'application/json',
            response_schema: RESPONSE_SCHEMA,
          },
        }),
      });

      if (response.ok) break;

      errorText = await response.text();
      errorStatus = '';
      try {
        errorStatus = JSON.parse(errorText)?.error?.status ?? '';
      } catch {
        // leave errorStatus empty if the body isn't JSON
      }

      const isOverloaded = response.status === 503 || errorStatus === 'UNAVAILABLE';
      if (!isOverloaded || attempt === MAX_ATTEMPTS) break;

      await new Promise((resolve) => setTimeout(resolve, attempt * 1000));
    }

    if (!response || !response.ok) {
      if (response?.status === 429 || errorStatus === 'RESOURCE_EXHAUSTED') {
        return new Response(JSON.stringify({ error: QUOTA_EXCEEDED_MESSAGE }), {
          status: 429,
          headers: Object.assign({}, corsHeaders, { 'Content-Type': 'application/json' }),
        });
      }
      if (response?.status === 503 || errorStatus === 'UNAVAILABLE') {
        return new Response(JSON.stringify({ error: OVERLOADED_MESSAGE }), {
          status: 503,
          headers: Object.assign({}, corsHeaders, { 'Content-Type': 'application/json' }),
        });
      }
      return new Response(JSON.stringify({ error: 'Gemini API error: ' + errorText }), {
        status: 502,
        headers: Object.assign({}, corsHeaders, { 'Content-Type': 'application/json' }),
      });
    }

    const data = await response.json();
    const text_ = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text_) {
      return new Response(JSON.stringify({ error: 'No structured result returned' }), {
        status: 502,
        headers: Object.assign({}, corsHeaders, { 'Content-Type': 'application/json' }),
      });
    }

    let parsed;
    try {
      parsed = JSON.parse(text_);
    } catch {
      return new Response(JSON.stringify({ error: 'Could not parse structured result' }), {
        status: 502,
        headers: Object.assign({}, corsHeaders, { 'Content-Type': 'application/json' }),
      });
    }

    return new Response(JSON.stringify(parsed), {
      headers: Object.assign({}, corsHeaders, { 'Content-Type': 'application/json' }),
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: Object.assign({}, corsHeaders, { 'Content-Type': 'application/json' }),
    });
  }
});
