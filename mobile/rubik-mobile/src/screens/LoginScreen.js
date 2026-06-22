import React, { useState } from 'react'
import { Alert, SafeAreaView, StyleSheet, Text, View } from 'react-native'
import ActionButton from '../components/ActionButton'
import FormField from '../components/FormField'
import { colors } from '../theme/colors'
import { radius, shadow, spacing } from '../theme/spacing'
import { typography } from '../theme/typography'

export default function LoginScreen({ onLogin }) {
  const [email, setEmail] = useState('r.rojas@rubikcreaciones.cl')
  const [password, setPassword] = useState('123456')
  const [loading, setLoading] = useState(false)

  const submit = async () => {
    setLoading(true)
    try {
      await onLogin({ email, password })
    } catch (error) {
      Alert.alert('No se pudo iniciar sesion', error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.hero}>
        <View style={styles.logo}>
          <Text style={styles.logoText}>R</Text>
        </View>
        <Text style={styles.kicker}>Rubik Creaciones</Text>
        <Text style={styles.title}>ERP movil interno</Text>
        <Text style={styles.subtitle}>Gestion comercial, documentos y operaciones desde terreno.</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Iniciar sesion</Text>
        <FormField
          label="Email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          placeholder="usuario@rubikcreaciones.cl"
        />
        <FormField
          label="Contrasena"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoCapitalize="none"
        />
        <ActionButton title={loading ? 'Ingresando...' : 'Ingresar'} onPress={submit} disabled={loading} loading={loading} />
        <Text style={styles.note}>Acceso temporal de desarrollo. No usar contrasenas reales.</Text>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: colors.background,
    flex: 1,
    justifyContent: 'center',
    padding: spacing.xl,
  },
  hero: {
    gap: spacing.sm,
    marginBottom: spacing.xxl,
  },
  logo: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: radius.xl,
    height: 58,
    justifyContent: 'center',
    width: 58,
  },
  logoText: {
    color: colors.textOnDark,
    fontSize: typography.sizes.xxl,
    fontWeight: typography.weights.black,
  },
  kicker: {
    color: colors.primarySoft,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.black,
    letterSpacing: 0,
    textTransform: 'uppercase',
  },
  title: {
    color: colors.textOnDark,
    fontSize: typography.sizes.display,
    fontWeight: typography.weights.black,
  },
  subtitle: {
    color: colors.textSoft,
    fontSize: typography.sizes.md,
    lineHeight: typography.lineHeights.relaxed,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    gap: spacing.md,
    padding: spacing.xl,
    ...shadow.raised,
  },
  cardTitle: {
    color: colors.text,
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.black,
  },
  note: {
    color: colors.textMuted,
    fontSize: typography.sizes.xs,
    textAlign: 'center',
  },
})
