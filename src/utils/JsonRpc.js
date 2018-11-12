import { COMMIT_MANAGER_URL } from '../constants/Layout';
import { writeTransactionToggled, handleError } from '../actions/uiState';
import { fetchAll } from '../actions';

class JsonRpc {
  constructor(store) {
    this.id = 0;
    this.thWrite = undefined;
    this.pendingThWrite = undefined;
    this.thRead = undefined;
    this.store = undefined;
  }

  setStore(store) {
    this.store = store;
  }

  async request(method, params) {
    const response = await fetch(`/jsonrpc/{method}`, {
      method: 'post',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: ++this.id,
        method: method,
        params: params
      })
    });

    if (!response.ok) {
      throw new Error(`Json-Rpc fetch failed: Status [${response.status
        }] ${response.statusText}`);
    }

    const json = await response.json();

    if (json.error) {
      if (json.error.message === 'Validation failed') {
        window.location.assign(COMMIT_MANAGER_URL);
      } else {
        throw new Error(`Json-Rpc response error: ${json.error.message +
          (json.error.data ? `\n${JSON.stringify(json.error.data)}` : '')}`);
      }
    }

    return json.result;
  }

  async query(params) {
    const th = await this.read();
    params = { th: th, result_as: 'string', ...params };
    return this.request('query', params);
  }

  async read() {
    const db = 'running';

    if (this.thWrite) { return this.thWrite; }
    if (this.thRead) { return this.thRead; }

    const res = await this.request('get_trans');
    const readTrans = res.trans.filter(c =>
      c.db === db && c.mode === 'read');
    const writeTrans = res.trans.filter(c =>
      c.db === db && c.mode === 'read_write');

    if (writeTrans.length > 0) {
      this.thWrite = writeTrans[0].th;
      this.store.dispatch(writeTransactionToggled(true));
      return writeTrans[0].th;
    }

    if (readTrans.length > 0) {
      this.thRead = readTrans[0].th;
      return readTrans[0].th;
    }

    const newTrans = await this.request('new_trans', {db: db, mode: 'read'});
    this.thRead = newTrans.th;

    return this.thRead;
  }

  async write() {
    const db = 'running';
    const mode = 'private';

    if (this.thWrite) { return this.thWrite; }

    if (this.pendingThWrite) {
      await this.pendingThWrite;
    } else {
      this.pendingThWrite = await this.request('new_trans', {
        db: db, conf_mode: mode, mode: 'read_write'
      });
    }

    this.thWrite = this.pendingThWrite.th;
    this.pendingThWrite = undefined;
    this.store.dispatch(writeTransactionToggled(true));

    return this.thWrite;
  }

  getWriteTransaction() {
    return this.thWrite;
  }

  apply = async () => {
    try {
      await this.request('validate_commit', {th: this.thWrite});
      await this.request('commit', {th: this.thWrite});
      this.thWrite = undefined;
      this.store.dispatch(writeTransactionToggled(false));
    } catch(error) {
      this.store.dispatch(handleError('Error committing transaction', error));
    }
  }

  revert = async () => {
    try {
      await this.request('delete_trans', {th: this.thWrite});
      this.thWrite = undefined;
      this.store.dispatch(writeTransactionToggled(false));
      this.store.dispatch(fetchAll());
    } catch(error) {
      this.store.dispatch(handleError('Error reverting transaction', error));
    }
  }
}

export default new JsonRpc();
