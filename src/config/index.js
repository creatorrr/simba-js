const config = {
  activemq: {
    wsurl: process.env.REACT_APP_MQ_WS_URL || 'wss://strong-frog.rmq.cloudamqp.com/ws',
    // apiEndpoint: process.env.REACT_APP_API_URL || 'https://strong-frog.rmq.cloudamqp.com/api',
    apiEndpoint: process.env.REACT_APP_API_URL || 'http://localhost:8000',
    login: 'sgnukaft',
    passcode: 'gZdkqmghwMQOejiyu0OJh_y1_25hloEc', 
    completionTopic: '/queue/completed',
    vhost: 'sgnukaft'
  }
}

export default config;