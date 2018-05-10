import Stomp from 'stompjs';
import { STATUS_CODES } from 'http';
import { NotificationManager } from 'react-notifications';
import { read, write } from 'edn-js';
import { simbaToJson, jsonToSimba } from '../edn';
const edn = window.jsedn;
const SYNC_INTERVAL = 60 * 1000;
export const STOMP_STATUS = {
  'INITIAL': 'INITIAL',
  'CONNECTING': 'CONNECTING',
  'CONNECTED': 'CONNECTED',
  'DISCONNECTED_SELF': 'DISCONNECTED_SELF',
  'DISCONNECTED_OTHER_SESSION': 'DISCONNECTED_OTHER_SESSION',
  'CONNECTION_FAILURE': 'CONNECTION_FAILURE',
  'ERROR': 'ERROR'
}

export const EOS_STATUS = {
  'ONLINE': 'online',
  'AWAY': 'away',
  'BUSY': 'busy',
  'OFFLINE': 'offline'
}


// const data = new Map([[Symbol(':key'), 'type'], [Symbol(':value'), 'EOS']]);
// const data1 = new Map([[Symbol(':key'), 'status'], [Symbol(':value'), 'offline']]);
// console.log(write([data, data1]).replace('#js/Array', '').replace('#js/Object', ''))
// console.log(read('[{:key "type" :value "EOS"} {:key "status" :value "offline"}]'))
// console.log(write(read('[{:key "type" :value "EOS"} {:key "status" :value "offline"}]')).replace('#js/Array', '').replace('#js/Object', ''))
// const Stomp = window.Stomp;
const LOCALSTORAGE_KEY = 'simbajs_messages';
export default class SimbaJS {
  /**
   * 
   * @param {Object} - Object including wsurl, login, passcode, completionTopic, vhost 
   */
  constructor({ wsurl, login, passcode, completionTopic = '/topic/task_completed', vhost }) {
    console.log('Starting MQ')
    const client = Stomp.client(wsurl);
    this.client = client;
    this.status = STOMP_STATUS.INITIAL;
    this.statusMessage = null;
    this.eosStatus = null;
    this.taskQueue = `/queue/task_${login}`;
    this.agentStatusTopic = `/topic/${login}_event`;
    this.eosQueue = `/queue/eos_${login}`;
    this.completionTopic = completionTopic;

    this.vhost = vhost || '/';
    this.login = login;
    this.passcode = passcode;
    this.messages = [];
    this.subscriptions = [];
    this.statusSubscriptions = [];

    this.latestLoginTimestamp = null;
    this.syncTimerId = null;
  }

  connect(onConnect, onError) {
    console.log('Trying to login');
    this.status = STOMP_STATUS.CONNECTING;
    this.client.connect(this.login, this.passcode, (frame) => {
      this.status = STOMP_STATUS.CONNECTED;
      this.latestLoginTimestamp = Date.now();

      this.client.subscribe(this.agentStatusTopic, (message) => {
        let eventParts = message.body.split(':');
        // Make sure it's agent status event -> {utc_timestamp}:{agent_id}:
        if (eventParts.length === 3 && /^[0-9]*$/.test(eventParts[0])) {
          const eventType = eventParts[2];
          if (eventType === STOMP_STATUS.CONNECTED) {
            if (parseInt(eventParts[0]) !== this.latestLoginTimestamp) {
              this.client.disconnect();
              this.status = STOMP_STATUS.DISCONNECTED_OTHER_SESSION;
              this.statusSubscriptions.forEach(cb => cb(this.status));
            }
          }
        }
      });
      // Publish login event to topic 500ms later
      setTimeout(() => {
        this.status = STOMP_STATUS.CONNECTED;


        this.client.send(this.agentStatusTopic, { retain: true }, `${this.latestLoginTimestamp}:${this.login}:${STOMP_STATUS.CONNECTED}`);
        this.setStatus(EOS_STATUS.ONLINE);
        this.statusSubscriptions.forEach(cb => cb(this.status));
        // Start sync timer
        this.syncTimerId = setInterval(() => {
          this.setStatus(this.eosStatus);
        }, SYNC_INTERVAL);
        // Subscribe to task queue 500ms later

        if (this.status === STOMP_STATUS.CONNECTED) {
          console.log('Subscribing to task queue');
          setTimeout(() => {
            this.client.subscribe(this.taskQueue, (message) => {
              console.info('A new task assigned');
              console.log(message);
              message.id = message.headers['message-id'];
              message.processed = false;
              message.task = simbaToJson(message.body);
              this.messages.push(message);
              this.subscriptions.forEach(cb => cb(message));
            }, { ack: 'client' });
          }, 500);
        }
      }, 500);

      if (onConnect)
        onConnect();
    }, (err) => {
      console.log('Failed to connect');
      console.log(err);
      this.status = STOMP_STATUS.CONNECTION_FAILURE;
      this.statusSubscriptions.forEach(cb => cb(this.status));
      if (onError)
        onError();
    }, this.vhost);
  }

  subscribe(cb) {
    this.subscriptions.push(cb);
  }

  onSimbaStatusChange(cb) {
    this.statusSubscriptions.push(cb);
  }
  disconnect() {
    if (this.client) {
      this.setStatus(EOS_STATUS.OFFLINE);
      clearInterval(this.syncTimerId);
      this.syncTimerId = null;
      this.client.disconnect(() => {
        this.status = STOMP_STATUS.DISCONNECTED_SELF;
        this.statusSubscriptions.forEach(cb => cb(this.status));
      });
    }
  }

  getTasks() {
    return this.messages;
  }

  setStatus(status) {
    this.eosStatus = status;
    this.client.send(this.eosQueue, {}, jsonToSimba({
      type: "EOS",
      status: status,
      timestamp: Date.now()
    }));
  }

  send(text) {
    this.client.send(this.taskQueue, { retain: true }, text)
  }

  processTask(taskId) {
    let task, index;
    this.messages.forEach((message, idx) => {
      if (message.id === taskId && message.processed === false) {
        task = message;
        index = idx;
      }
    })
    if (task) {
      task.ack();
      task.processed = true;
      if (task.task.timestamp)
        this.client.send(this.completionTopic, {}, task.task.timestamp);
      // this.messages.splice(index, 1);
    }
  }
}