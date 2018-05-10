# simba-js

Core of simba-js is task client which listens to rabbitmq queue and syncing status.
`/src/libs/simbajs` covers core concept of simba-js client.  
simba-js is based on web-stomp protocol which requires websocket connection to rabbitmq.  

## simba-js client

### Initialization

```javascript
  import SimbaJS 'path/to/simbajs';
  ...
  const client = new SimbaJS({
    wsurl: 'wss://myrabbitmqserver.com/ws',
    login: 'mylogin',
    password: 'mypassword',
    completionTopic: '/topic/completion',(Optional),
    vhost: 'myhost'
  })
```

completionTopic defaults to `/topic/task_completed` if not proivded in constructor.

### Connect
```javascript
  client.connect([onConnect, [onError]])

  // To subscribe to the simba connection status change
  client.onSimbaStatusChange((simbaStatus) => {
    ...
  })
```

### Disconnect
```javascript
  client.disconnect();
```

### Process task(Acknowledge message)
Assume you have message object

```javascript
  client.processTask(message.id)
```

Message is originated from stompjs message object.
It has additional properties added,   
1. id - String: Message ID
2. processed - Boolean: Status for processed/unprocessed  
3. task - Object: Duplication of message body

### Subscribe to new messages
```javascript
  client.subscribe((message) => {
    ...
    // Process message
    ...
    // To get all messages
    const messages = client.getTasks();
  })
```
## EDN Parser
EDN Parser is based on [jsedn](https://github.com/shaunxcode/jsedn)

Simba string from the queue is in format of 
`[{:key "key1" :value "value1"} {:key "key2" :value "value2"} ... {:key "keyn" :value "valuen"}]`
### Simba string to json/json to string
```javascript
  import { simbaToJson, jsonToSimba } from 'path/to/edn';
  const json = simbaToJson('[{:key "type" :value "EOS"} {:key "status" :value "offline"}]');
  const simbaStr = jsonToSimba(json);
```

## Install
```
npm install
```

## Run
```
npm run start
```

## Sample application
This project itself is an example of how to use simba-js with react.js. 

`/src/views/main/index.js` covers full usage of simba-js.
