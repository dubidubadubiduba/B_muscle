import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Button, Text } from 'react-native-paper';
import { supabase } from '../../lib/supabase';

export default function SignInScreen() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleGoogleSignIn() {
    setError(null);
    setLoading(true);
    const { error: authError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: typeof window !== 'undefined' ? window.location.origin : undefined,
      },
    });
    if (authError) {
      setError(authError.message);
      setLoading(false);
    }
    // On success the browser redirects to Google, so no further local state change is needed here.
  }

  return (
    <View style={styles.container}>
      <Text variant="headlineMedium" style={styles.title}>
        B_muscle
      </Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Button mode="contained" onPress={handleGoogleSignIn} loading={loading} style={styles.button}>
        Google로 계속하기
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24 },
  title: { textAlign: 'center', marginBottom: 32 },
  button: { marginBottom: 12 },
  error: { color: 'red', marginBottom: 12, textAlign: 'center' },
});
