// ─────────────────────────────────────────────────────────────────────────────
//  lockStore.ts — couche métier du verrouillage app (équivalent web de
//  mobile/lib/core/lock/app_lock_notifier.dart + app_lock_settings.dart).
//
//  Sur Flutter, l'état est persisté dans le secure storage (Keystore/Keychain)
//  et le PIN est haché en SHA-256. Sur le web, on n'a pas de secure storage
//  natif : on persiste dans localStorage et on hache en SHA-256 via l'API
//  Web Crypto (crypto.subtle). Le hachage évite simplement de stocker le PIN
//  en clair — même limite de sécurité que côté mobile (un attaquant qui lit le
//  storage a déjà accès à tout).
//
//  ÉCART biométrie : il n'y a pas d'équivalent web fiable de FaceID/empreinte
//  (local_auth). WebAuthn existe mais sort du périmètre demandé. On expose donc
//  `canUseBiometric()` qui renvoie toujours false → l'UI masque l'option bio,
//  exactement comme un appareil sans bio enrôlée côté Flutter.
// ─────────────────────────────────────────────────────────────────────────────

import { useSyncExternalStore } from 'react'

/// Préférences de verrouillage — miroir de AppLockSettings (Dart).
export interface AppLockSettings {
  /// Verrouillage actif au démarrage et en retour foreground.
  enabled: boolean
  /// SHA-256 du PIN à 4 chiffres. Jamais le PIN en clair. null = pas de PIN.
  pinHash: string | null
  /// Bio acceptée en plus du PIN. Toujours false sur le web (pas de local_auth).
  biometricEnabled: boolean
}

/// Valeur par défaut — verrouillage désactivé (équiv. AppLockSettings.disabled).
const DEFAUT: AppLockSettings = {
  enabled: false,
  pinHash: null,
  biometricEnabled: false,
}

/// Clé localStorage des préférences de verrouillage.
const STORAGE_KEY = 'tonji-lock'

// ─────────────────────────────────────────────────────────────────────────────
//  Persistance
// ─────────────────────────────────────────────────────────────────────────────

/// Charge les réglages depuis localStorage. Tout échec retombe sur le défaut.
function chargerSettings(): AppLockSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAUT
    const parsed = JSON.parse(raw) as Partial<AppLockSettings>
    return {
      enabled: Boolean(parsed.enabled),
      pinHash: typeof parsed.pinHash === 'string' ? parsed.pinHash : null,
      biometricEnabled: Boolean(parsed.biometricEnabled),
    }
  } catch {
    return DEFAUT
  }
}

/// Persiste les réglages dans localStorage.
function sauverSettings(s: AppLockSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s))
  } catch {
    // Storage indisponible (mode privé strict) — on ignore : le lock vivra
    // alors uniquement le temps de la session courante via l'état mémoire.
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  Hachage du PIN (SHA-256, équiv. crypto.dart sha256)
// ─────────────────────────────────────────────────────────────────────────────

/// Hash SHA-256 du PIN (UTF-8), encodé en hexadécimal minuscule — même format
/// que `sha256.convert(utf8.encode(pin)).toString()` côté Dart.
async function hashPin(pin: string): Promise<string> {
  const data = new TextEncoder().encode(pin)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

// ─────────────────────────────────────────────────────────────────────────────
//  Store réactif minimal (pattern useSyncExternalStore, pas de dépendance)
// ─────────────────────────────────────────────────────────────────────────────

/// État courant en mémoire — initialisé depuis le storage au chargement du module.
let _state: AppLockSettings = chargerSettings()

/// `true` après un déverrouillage réussi cette « session » (onglet ouvert).
/// Reset à false au prochain démarrage de l'app (rechargement de page).
let _unlocked = false

/// Abonnés React notifiés à chaque mutation de l'état.
const _listeners = new Set<() => void>()

/// Notifie tous les abonnés (déclenche un re-render des composants).
function _emit(): void {
  for (const l of _listeners) l()
}

/// Remplace l'état, persiste et notifie.
function _setState(next: AppLockSettings): void {
  _state = next
  sauverSettings(next)
  _emit()
}

// ─────────────────────────────────────────────────────────────────────────────
//  API publique — équivalents des méthodes de AppLockNotifier
// ─────────────────────────────────────────────────────────────────────────────

export const lockStore = {
  /// Lecture synchrone de l'état (pour les contrôleurs hors React).
  getSettings(): AppLockSettings {
    return _state
  },

  /// `true` si la session est déverrouillée OU si le lock est désactivé
  /// (équiv. `isUnlocked` Dart).
  isUnlocked(): boolean {
    return _unlocked || !_state.enabled
  },

  /// Active le verrouillage en posant un PIN tout neuf (4 chiffres, validé UI).
  /// Marque la session courante comme déverrouillée (équiv. setupPin Dart).
  async setupPin(pin: string): Promise<void> {
    const hash = await hashPin(pin)
    _setState({ ..._state, enabled: true, pinHash: hash })
    _unlocked = true
  },

  /// Vérifie qu'un PIN tapé correspond au hash stocké (équiv. verifyPin Dart).
  async verifyPin(pin: string): Promise<boolean> {
    const hash = _state.pinHash
    if (hash == null) return false
    return (await hashPin(pin)) === hash
  },

  /// Désactivation complète : efface PIN + bio (équiv. disable Dart).
  disable(): void {
    _setState({ ...DEFAUT })
    _unlocked = false
  },

  /// Pas de biométrie fiable sur le web → toujours false. L'UI masque alors
  /// l'option, comme un appareil sans bio enrôlée côté Flutter.
  async canUseBiometric(): Promise<boolean> {
    return false
  },

  /// Marque la session déverrouillée après un bon PIN (équiv. markUnlocked Dart).
  markUnlocked(): void {
    _unlocked = true
  },

  /// Reverrouille la session (équiv. markLocked Dart) — non câblé sur le web
  /// faute d'observateur de cycle de vie fiable, mais exposé pour cohérence.
  markLocked(): void {
    _unlocked = false
  },

  /// S'abonne aux changements d'état. Renvoie une fonction de désabonnement.
  subscribe(listener: () => void): () => void {
    _listeners.add(listener)
    return () => {
      _listeners.delete(listener)
    }
  },
}

// ─────────────────────────────────────────────────────────────────────────────
//  Hook React — lit l'état de façon réactive (re-render sur changement)
// ─────────────────────────────────────────────────────────────────────────────

/// Hook d'accès réactif aux réglages de verrouillage.
export function useLockSettings(): AppLockSettings {
  return useSyncExternalStore(lockStore.subscribe, lockStore.getSettings)
}
