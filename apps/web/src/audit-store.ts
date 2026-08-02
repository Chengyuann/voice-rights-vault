export type AuditVerificationStatus = 'unverified' | 'verified' | 'failed'

export type AuditRecord<TManifest = unknown> = {
  id: string
  createdAt: string
  audio: Blob
  audioName: string
  manifest: TManifest
  audioHash: string
  provenanceId: string | null
  purpose: string
  provider: string
  executionMode: string
  authorizationTransactionId: string | null
  receiptTransactionId: string | null
  verificationStatus: AuditVerificationStatus
  verifiedAt: string | null
}

const databaseName = 'voice-rights-vault'
const storeName = 'audit-packages'
const databaseVersion = 1

function openAuditDatabase() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(databaseName, databaseVersion)
    request.onupgradeneeded = () => {
      const database = request.result
      if (!database.objectStoreNames.contains(storeName)) {
        const store = database.createObjectStore(storeName, { keyPath: 'id' })
        store.createIndex('createdAt', 'createdAt')
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error || new Error('Audit database could not be opened.'))
  })
}

function runTransaction<T>(
  mode: IDBTransactionMode,
  operation: (store: IDBObjectStore, resolve: (value: T) => void, reject: (reason?: unknown) => void) => void,
) {
  return openAuditDatabase().then((database) => new Promise<T>((resolve, reject) => {
    const transaction = database.transaction(storeName, mode)
    const store = transaction.objectStore(storeName)
    transaction.oncomplete = () => database.close()
    transaction.onerror = () => {
      database.close()
      reject(transaction.error || new Error('Audit database transaction failed.'))
    }
    operation(store, resolve, reject)
  }))
}

export function saveAuditRecord<TManifest>(record: AuditRecord<TManifest>) {
  return runTransaction<void>('readwrite', (store, resolve, reject) => {
    const request = store.put(record)
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

export function listAuditRecords<TManifest>() {
  return runTransaction<Array<AuditRecord<TManifest>>>('readonly', (store, resolve, reject) => {
    const request = store.getAll()
    request.onsuccess = () => {
      const records = request.result as Array<AuditRecord<TManifest>>
      resolve(records.sort((left, right) => right.createdAt.localeCompare(left.createdAt)))
    }
    request.onerror = () => reject(request.error)
  })
}

export function deleteAuditRecord(id: string) {
  return runTransaction<void>('readwrite', (store, resolve, reject) => {
    const request = store.delete(id)
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

export function updateAuditVerification(id: string, status: AuditVerificationStatus) {
  return runTransaction<void>('readwrite', (store, resolve, reject) => {
    const getRequest = store.get(id)
    getRequest.onsuccess = () => {
      const record = getRequest.result as AuditRecord | undefined
      if (!record) {
        resolve()
        return
      }
      record.verificationStatus = status
      record.verifiedAt = status === 'unverified' ? null : new Date().toISOString()
      const putRequest = store.put(record)
      putRequest.onsuccess = () => resolve()
      putRequest.onerror = () => reject(putRequest.error)
    }
    getRequest.onerror = () => reject(getRequest.error)
  })
}
