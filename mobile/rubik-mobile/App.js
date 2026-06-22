import React, { useEffect, useMemo, useState } from 'react'
import {
  Alert,
  Modal,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'

import { apiClient, setApiSession } from './src/services/apiClient'
import LoginScreen from './src/screens/LoginScreen'
import DashboardScreen from './src/screens/DashboardScreen'
import ClientsScreen from './src/screens/ClientsScreen'
import QuotesScreen from './src/screens/QuotesScreen'
import QuoteDetailScreen from './src/screens/QuoteDetailScreen'
import DocumentsScreen from './src/screens/DocumentsScreen'
import TendersScreen from './src/screens/TendersScreen'
import WorkOrdersScreen from './src/screens/WorkOrdersScreen'
import WorkOrderDetailScreen from './src/screens/WorkOrderDetailScreen'
import FinanceScreen from './src/screens/FinanceScreen'
import SuppliersScreen from './src/screens/SuppliersScreen'
import UsersScreen from './src/screens/UsersScreen'
import AssistantScreen from './src/screens/AssistantScreen'
import AppHeader from './src/components/AppHeader'
import LoadingState from './src/components/LoadingState'
import { colors } from './src/theme/colors'
import { radius, spacing } from './src/theme/spacing'
import { typography } from './src/theme/typography'

const SESSION_KEY = 'rubik.mobile.session'

const hasPermission = (user, permission) =>
  Boolean(user?.permissions?.includes('admin.all') || user?.permissions?.includes(permission))

const baseMenu = [
  { key: 'dashboard', label: 'Inicio', permission: 'dashboard.view' },
  { key: 'clients', label: 'Clientes', permission: 'clients.view' },
  { key: 'quotes', label: 'Coti', permission: 'quotes.view' },
  { key: 'documents', label: 'Docs', permission: 'documents.view' },
  { key: 'finance', label: 'Finanzas', permission: 'finance.view' },
  { key: 'workorders', label: 'Ordenes', permission: 'workorders.view' },
  { key: 'tenders', label: 'Licitaciones', permission: 'tenders.view' },
  { key: 'suppliers', label: 'Proveedores', permission: 'suppliers.view' },
  { key: 'users', label: 'Usuarios', permission: 'users.view' },
  { key: 'assistant', label: 'Asistente IA', permission: 'ai.chat' },
]

const primaryMenuKeys = ['dashboard', 'clients', 'quotes', 'documents']

const getActiveMenuKey = (screen) => {
  if (screen === 'quoteDetail') return 'quotes'
  if (screen === 'workOrderDetail') return 'workorders'
  return screen
}

const isAuthError = (error) => error?.status === 401 || /iniciar sesión/i.test(error?.message || '')

const getInitials = (name = 'Rubik') =>
  String(name)
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase()

const getUserProfileLine = (user = {}) => [user.role, user.area].filter(Boolean).join(' / ')

export default function App() {
  const [session, setSession] = useState(null)
  const [activeScreen, setActiveScreen] = useState('dashboard')
  const [selectedQuote, setSelectedQuote] = useState(null)
  const [selectedWorkOrder, setSelectedWorkOrder] = useState(null)
  const [authReady, setAuthReady] = useState(false)
  const [userMenuVisible, setUserMenuVisible] = useState(false)
  const [moreMenuVisible, setMoreMenuVisible] = useState(false)

  useEffect(() => {
    const loadSession = async () => {
      try {
        const storedSession = await AsyncStorage.getItem(SESSION_KEY)
        if (!storedSession) return

        const parsedSession = JSON.parse(storedSession)
        if (!parsedSession?.token || !parsedSession?.user) {
          await AsyncStorage.removeItem(SESSION_KEY)
          setApiSession(null)
          return
        }

        setApiSession(parsedSession)

        try {
          const me = await apiClient.me()
          const restoredSession = { ...parsedSession, user: me.user || parsedSession.user }
          await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(restoredSession))
          setApiSession(restoredSession)
          setSession(restoredSession)
        } catch (error) {
          if (isAuthError(error)) {
            await AsyncStorage.removeItem(SESSION_KEY)
            setApiSession(null)
            setSession(null)
            return
          }

          setSession(parsedSession)
        }
      } catch (error) {
        await AsyncStorage.removeItem(SESSION_KEY)
        setApiSession(null)
        setSession(null)
      } finally {
        setAuthReady(true)
      }
    }

    loadSession()
  }, [])

  const menuItems = useMemo(
    () => baseMenu.filter((item) => hasPermission(session?.user, item.permission)),
    [session],
  )
  const primaryMenuItems = menuItems.filter((item) => primaryMenuKeys.includes(item.key)).slice(0, 4)
  const moreMenuItems = menuItems.filter((item) => !primaryMenuKeys.includes(item.key))

  const handleLogin = async (credentials) => {
    const nextSession = await apiClient.login(credentials)
    await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(nextSession))
    setApiSession(nextSession)
    setSession(nextSession)
    setActiveScreen('dashboard')
  }

  const handleLogout = async () => {
    await AsyncStorage.removeItem(SESSION_KEY)
    setApiSession(null)
    setSession(null)
    setSelectedQuote(null)
    setSelectedWorkOrder(null)
    setUserMenuVisible(false)
    setMoreMenuVisible(false)
    setActiveScreen('dashboard')
  }

  const syncSession = async () => {
    try {
      const me = await apiClient.me()
      const nextSession = { ...session, user: me.user || session.user }
      await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(nextSession))
      setApiSession(nextSession)
      setSession(nextSession)
      Alert.alert('Sincronización lista', 'Tus datos de sesión están actualizados.')
    } catch (error) {
      Alert.alert('No se pudo sincronizar', error.message)
    }
  }

  if (!authReady) {
    return (
      <SafeAreaView style={styles.center}>
        <LoadingState message="Cargando Rubik ERP..." />
      </SafeAreaView>
    )
  }

  if (!session) {
    return <LoginScreen onLogin={handleLogin} />
  }

  const navigate = (key) => {
    setSelectedQuote(null)
    setSelectedWorkOrder(null)
    setMoreMenuVisible(false)
    setUserMenuVisible(false)
    setActiveScreen(key)
  }

  const commonProps = { session, hasPermission: (permission) => hasPermission(session.user, permission) }
  const screens = {
    dashboard: <DashboardScreen {...commonProps} onNavigate={navigate} />,
    clients: <ClientsScreen {...commonProps} />,
    quotes: <QuotesScreen {...commonProps} onOpenQuote={(quote) => { setSelectedQuote(quote); setActiveScreen('quoteDetail') }} />,
    quoteDetail: <QuoteDetailScreen {...commonProps} quote={selectedQuote} onBack={() => setActiveScreen('quotes')} />,
    documents: <DocumentsScreen {...commonProps} />,
    tenders: <TendersScreen {...commonProps} />,
    workorders: <WorkOrdersScreen {...commonProps} onOpenWorkOrder={(order) => { setSelectedWorkOrder(order); setActiveScreen('workOrderDetail') }} />,
    workOrderDetail: <WorkOrderDetailScreen {...commonProps} workOrder={selectedWorkOrder} onBack={() => setActiveScreen('workorders')} />,
    finance: <FinanceScreen {...commonProps} onNavigate={navigate} />,
    suppliers: <SuppliersScreen {...commonProps} />,
    users: <UsersScreen {...commonProps} />,
    assistant: <AssistantScreen {...commonProps} />,
  }
  const activeMenuKey = getActiveMenuKey(activeScreen)
  const moreIsActive = moreMenuItems.some((item) => item.key === activeMenuKey)

  return (
    <SafeAreaView style={styles.safeArea}>
      <AppHeader user={session.user} onOpenMenu={() => setUserMenuVisible(true)} />
      <View style={styles.content}>{screens[activeScreen] || screens.dashboard}</View>

      <View style={styles.bottomBar}>
        {primaryMenuItems.map((item) => {
          const active = activeMenuKey === item.key
          return (
            <TouchableOpacity
              activeOpacity={0.82}
              key={item.key}
              onPress={() => navigate(item.key)}
              style={[styles.navItem, active && styles.navItemActive]}
            >
              <Text style={[styles.navLabel, active && styles.navLabelActive]}>{item.label}</Text>
            </TouchableOpacity>
          )
        })}
        {moreMenuItems.length > 0 ? (
          <TouchableOpacity
            activeOpacity={0.82}
            onPress={() => setMoreMenuVisible(true)}
            style={[styles.navItem, moreIsActive && styles.navItemActive]}
          >
            <Text style={[styles.navLabel, moreIsActive && styles.navLabelActive]}>Más</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      <Modal transparent visible={userMenuVisible} animationType="slide" onRequestClose={() => setUserMenuVisible(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setUserMenuVisible(false)}>
          <Pressable style={styles.sheet}>
            <Text style={styles.sheetTitle}>Cuenta Rubik</Text>
            <Text style={styles.sheetSubtitle}>{session.user.name}</Text>
            <View style={styles.profileBox}>
              <View style={styles.profileAvatar}>
                <Text style={styles.profileAvatarText}>{getInitials(session.user.name)}</Text>
              </View>
              <View style={styles.profileText}>
                <Text style={styles.profileName} numberOfLines={1}>{session.user.name}</Text>
                <Text style={styles.profileMeta} numberOfLines={1}>{getUserProfileLine(session.user)}</Text>
                <Text style={styles.profileMeta} numberOfLines={1}>{session.user.email}</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.sheetItem} onPress={() => Alert.alert('Mi perfil', `${session.user.name}\n${session.user.email}`)}>
              <Text style={styles.sheetItemText}>Mi perfil</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.sheetItem} onPress={syncSession}>
              <Text style={styles.sheetItemText}>Sincronizar datos</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.sheetItem, styles.dangerItem]} onPress={handleLogout}>
              <Text style={[styles.sheetItemText, styles.dangerText]}>Cerrar sesión</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal transparent visible={moreMenuVisible} animationType="slide" onRequestClose={() => setMoreMenuVisible(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setMoreMenuVisible(false)}>
          <Pressable style={styles.sheet}>
            <Text style={styles.sheetTitle}>Más módulos</Text>
            <View style={styles.profileBox}>
              <View style={styles.profileAvatar}>
                <Text style={styles.profileAvatarText}>{getInitials(session.user.name)}</Text>
              </View>
              <View style={styles.profileText}>
                <Text style={styles.profileName} numberOfLines={1}>{session.user.name}</Text>
                <Text style={styles.profileMeta} numberOfLines={1}>{getUserProfileLine(session.user)}</Text>
                <Text style={styles.profileMeta} numberOfLines={1}>{session.user.email}</Text>
              </View>
            </View>
            <View style={styles.moreGrid}>
              {moreMenuItems.map((item) => (
                <TouchableOpacity key={item.key} style={styles.moreItem} onPress={() => navigate(item.key)}>
                  <Text style={styles.moreText}>{item.label}</Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                style={styles.moreItem}
                onPress={() => {
                  setMoreMenuVisible(false)
                  setUserMenuVisible(true)
                }}
              >
                <Text style={styles.moreText}>Perfil</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: colors.background,
    flex: 1,
  },
  center: {
    alignItems: 'center',
    backgroundColor: colors.surfaceMuted,
    flex: 1,
    justifyContent: 'center',
  },
  content: {
    backgroundColor: colors.surfaceMuted,
    flex: 1,
  },
  bottomBar: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderTopColor: colors.border,
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: spacing.xs,
    justifyContent: 'space-around',
    paddingBottom: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.sm,
  },
  navItem: {
    alignItems: 'center',
    borderRadius: radius.pill,
    flex: 1,
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: spacing.xs,
  },
  navItemActive: {
    backgroundColor: colors.primary,
  },
  navLabel: {
    color: colors.textMuted,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.black,
  },
  navLabelActive: {
    color: colors.textOnDark,
  },
  modalBackdrop: {
    backgroundColor: 'rgba(15, 23, 42, 0.48)',
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    gap: spacing.sm,
    padding: spacing.xl,
  },
  sheetTitle: {
    color: colors.text,
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.black,
  },
  sheetSubtitle: {
    color: colors.textMuted,
    marginBottom: spacing.sm,
  },
  sheetItem: {
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.lg,
  },
  sheetItemText: {
    color: colors.text,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
  },
  dangerItem: {
    backgroundColor: colors.dangerSoft,
    borderColor: colors.dangerSoft,
  },
  dangerText: {
    color: colors.danger,
  },
  profileBox: {
    alignItems: 'center',
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.md,
  },
  profileAvatar: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  profileAvatarText: {
    color: colors.textOnDark,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.black,
  },
  profileText: {
    flex: 1,
    minWidth: 0,
  },
  profileName: {
    color: colors.text,
    fontWeight: typography.weights.black,
  },
  profileMeta: {
    color: colors.textMuted,
    fontSize: typography.sizes.xs,
  },
  moreGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  moreItem: {
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    flexBasis: '47%',
    flexGrow: 1,
    padding: spacing.lg,
  },
  moreText: {
    color: colors.text,
    fontWeight: typography.weights.black,
  },
})
