import isPromise, { createDeferredPromise, CreateDeferredPromiseResult, DataStore, EMPTY_STORE, getCurrentSecond, StorageAdaptor } from "./utils"

export interface StorageHelperParams {
  storageKey: string
  version: number
  storage?: StorageAdaptor
  timeout?: number
}

export class StorageHelper<T> {
  private storageKey: string
  private version: number
  private timeout: number = -1

  store: DataStore<T> | null = null

  readonly storage: StorageAdaptor = localStorage

  ready: CreateDeferredPromiseResult<boolean> = createDeferredPromise<boolean>()
  
  constructor({
    storageKey, 
    version, 
    storage, 
    timeout,
  }: StorageHelperParams) {
    this.storageKey = storageKey
    this.version = version

    if (storage && 'getItem' in storage && 'setItem' in storage) {
      this.storage = storage
    }

    if (typeof timeout === 'number' && timeout > 0) {
      this.timeout = timeout
    }
  }


  load (forceLoad?: boolean) {
    if (!forceLoad && this.store) {
      return this
    }
    const result: Promise<string> | string | null= this.storage.getItem(this.storageKey)
    if (isPromise(result)) {
      result.then(res => { 
        this.initStore(res)
        this.ready.resolve(true)
      }).catch(() => {
        this.initStore(null)
        this.ready.resolve(true)
      })
    } else {
      this.initStore(result)
      this.ready.resolve(true)
    }
    return this
  }

  initStore (storeStr: string | null) {
    let store = storeStr ? JSON.parse(storeStr) : {}
    if (storeStr && store.version !== this.version) {
      store = this.upgrade()
    }
    this.store = store || {...EMPTY_STORE}
  }

  whenReady () {
    return this.ready
  }

  ensureLoad() {
    this.load()
    return this
  }

  setData(data: T) {
    if (this.store) {
      this.store.data = data
    }
    return this
  }

  getData () {
    if (this.timeout < 0) {
      return this.store?.data
    }
    if (getCurrentSecond() < (this.store?.modifiedOn || 0) + this.timeout) {
      return this.store?.data
    }
    return null
  }

  commit () {
    const store = this.store || EMPTY_STORE
    store.version = this.version
    const now = getCurrentSecond()
    if (!store.createdOn) {
      store.createdOn = now
    }
    store.modifiedOn = now
    this.storage.setItem(this.storageKey, JSON.stringify(store))
    return this
  }

  get (key: string) {
    return this.store?.[key]
  }

  upgrade () {
    return null
  }

}
