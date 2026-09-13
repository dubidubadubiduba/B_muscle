const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY');
const ANTHROPIC_MODEL = 'claude-sonnet-5';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const IMPORT_WORKOUTS_TOOL = {
  name: 'import_workouts',
  description: 'Structured workout log extracted from free-form Korean workout notes.',
  input_schema: {
    type: 'object',
    properties: {
      workouts: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            date: { type: 'string', description: 'YYYY-MM-DD' },
            bodyPart: { type: ['string', 'null'] },
            estimatedCalories: { type: ['number', 'null'] },
            exercises: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  sets: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        weightKg: { type: ['number', 'null'] },
                        reps: { type: ['number', 'null'] },
                        setType: { type: 'string', enum: ['normal', 'drop', 'assisted'] },
                        holdSeconds: { type: ['number', 'null'] },
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
  },
};

const SYSTEM_PROMPT =
  '당신은 한국어로 손으로 적은 운동 일지를 구조화된 데이터로 변환하는 도우미입니다' + '\n' +
  '규칙' + '\n' +
  '드롭세트 표기 예시 35kg 30회 플러스 25kg 20회 드롭 2세트 는 각 무게를 별도의 set으로 나누고 setType을 drop으로 표시합니다' + '\n' +
  '보조 중량 보조 친딥 예시 42kg 보조 는 setType을 assisted로 표시합니다' + '\n' +
  '등척성 홀드 예시 10초 정지 홀드 는 holdSeconds에 초 단위 숫자를 채웁니다 없으면 null' + '\n' +
  '일반 세트는 setType normal' + '\n' +
  '날짜가 명시되어 있지 않은 항목은 건너뜁니다' + '\n' +
  '원문에 없는 숫자는 절대 지어내지 말고 null로 둡니다' + '\n' +
  'import_workouts 도구를 반드시 호출해서 결과를 반환하세요';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (!ANTHROPIC_API_KEY) {
    return new Response(JSON.stringify({ error: 'ANTHROPIC_API_KEY is not configured' }), {
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

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: ANTHROPIC_MODEL,
        max_tokens: 8000,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: text }],
        tools: [IMPORT_WORKOUTS_TOOL],
        tool_choice: { type: 'tool', name: 'import_workouts' },
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      return new Response(JSON.stringify({ error: 'Anthropic API error: ' + errorBody }), {
        status: 502,
        headers: Object.assign({}, corsHeaders, { 'Content-Type': 'application/json' }),
      });
    }

    const data = await response.json();
    const blocks = data.content || [];
    let toolUse = null;
    for (let i = 0; i < blocks.length; i += 1) {
      if (blocks[i].type === 'tool_use') {
        toolUse = blocks[i];
        break;
      }
    }

    if (!toolUse) {
      return new Response(JSON.stringify({ error: 'No structured result returned' }), {
        status: 502,
        headers: Object.assign({}, corsHeaders, { 'Content-Type': 'application/json' }),
      });
    }

    return new Response(JSON.stringify(toolUse.input), {
      headers: Object.assign({}, corsHeaders, { 'Content-Type': 'application/json' }),
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: Object.assign({}, corsHeaders, { 'Content-Type': 'application/json' }),
    });
  }
});
