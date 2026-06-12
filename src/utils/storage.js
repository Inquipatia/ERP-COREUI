import { useEffect, useState } from 'react'

export const STORAGE_KEYS = {
  clients: 'rubik.erp.clients',
  materials: 'rubik.erp.materials',
  products: 'rubik.erp.products',
  quotes: 'rubik.erp.quotes',
  documents: 'rubik.erp.documents',
  commercialSettings: 'rubik.erp.commercialSettings',
}

const canUseLocalStorage = () => typeof window !== 'undefined' && Boolean(window.localStorage)

export const createLocalId = (prefix) =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

export const readStorage = (key, fallbackValue) => {
  if (!canUseLocalStorage()) {
    return fallbackValue
  }

  try {
    const storedValue = window.localStorage.getItem(key)

    if (!storedValue) {
      return fallbackValue
    }

    return JSON.parse(storedValue)
  } catch (error) {
    console.error(`Error reading localStorage key ${key}:`, error)
    return fallbackValue
  }
}

export const writeStorage = (key, value) => {
  if (!canUseLocalStorage()) {
    return
  }

  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch (error) {
    console.error(`Error writing localStorage key ${key}:`, error)
  }
}

export const normalizeCollection = (collection, normalizeItem = (item) => item) =>
  (Array.isArray(collection) ? collection : []).map(normalizeItem)

export const getStoredCollection = (key, fallbackValue = [], normalizeItem = (item) => item) =>
  normalizeCollection(readStorage(key, fallbackValue), normalizeItem)

export const saveStoredCollection = (key, collection) => {
  writeStorage(key, normalizeCollection(collection))
}

export const updateStoredCollection = (key, updater, fallbackValue = []) => {
  const currentCollection = readStorage(key, fallbackValue)
  const nextCollection = updater(normalizeCollection(currentCollection))
  saveStoredCollection(key, nextCollection)

  return nextCollection
}

export const upsertCollectionItem = (
  collection,
  item,
  {
    getKey = (collectionItem) => collectionItem.id,
    normalizeItem = (collectionItem) => collectionItem,
    mergeItems = (currentItem, nextItem) => ({ ...currentItem, ...nextItem }),
  } = {},
) => {
  const normalizedCollection = normalizeCollection(collection, normalizeItem)
  const nextItem = normalizeItem(item)
  const nextKey = getKey(nextItem)
  let itemWasUpdated = false

  const nextCollection = normalizedCollection.map((currentItem) => {
    if (getKey(currentItem) !== nextKey) {
      return currentItem
    }

    itemWasUpdated = true
    return normalizeItem(mergeItems(currentItem, nextItem))
  })

  return itemWasUpdated ? nextCollection : [...nextCollection, nextItem]
}

export const deleteCollectionItem = (
  collection,
  targetKey,
  {
    getKey = (collectionItem) => collectionItem.id,
    normalizeItem = (collectionItem) => collectionItem,
  } = {},
) => normalizeCollection(collection, normalizeItem).filter((item) => getKey(item) !== targetKey)

export const seedStorage = (key, initialValue) => {
  const storedValue = readStorage(key, null)

  if (storedValue !== null) {
    return storedValue
  }

  writeStorage(key, initialValue)
  return initialValue
}

export const useLocalStorageState = (key, initialValue) => {
  const [value, setValue] = useState(() => seedStorage(key, initialValue))

  useEffect(() => {
    writeStorage(key, value)
  }, [key, value])

  return [value, setValue]
}
