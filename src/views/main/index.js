import React, { Component } from 'react';
import config from '../../config/index';
import Stomp from 'stompjs';
import { read, write, edn, List, UUID } from 'edn-js';
import { Container, Form, Label, Input, Button, FormGroup, Row, Col } from 'reactstrap';
import SimbaJS, { STOMP_STATUS, EOS_STATUS } from '../../libs/simbajs';
import { NotificationManager } from 'react-notifications';
// const type = require('type');
const SIMBA_STATUS_MESSAGES = {
  [STOMP_STATUS.CONNECTED]: { message: `You're successfully logged in.`, type: 'SUCCESS' },
  [STOMP_STATUS.CONNECTION_FAILURE]: { message: `Failed to connect to server`, type: 'SUCCESS' },
  [STOMP_STATUS.ERROR]: { message: `Unexpected error happened in connection`, type: 'ERROR' },
  [STOMP_STATUS.DISCONNECTED_SELF]: { message: `Logged out successfully`, type: 'SUCCESS' },
  [STOMP_STATUS.DISCONNECTED_OTHER_SESSION]: { message: `Logging out as you logged in from somewhere else`, type: 'ERROR' }
}

export default class extends Component {
  constructor(props) {
    super(props);


    this.state = {
      text: '',
      messages: [],
      stompClient: {},
      tasks: [],
      simbaStatus: ''
    };
    this.handleInputChange = this.handleInputChange.bind(this);
    this.handleSubmit = this.handleSubmit.bind(this);
    this.handleLogin = this.handleLogin.bind(this);
    this.handleLogout = this.handleLogout.bind(this);
  }

  handleInputChange = (e) => {
    this.setState({ text: e.target.value });
  }

  componentDidMount() {

  }
  handleSubmit = (e) => {
    this.state.stompClient.send(this.state.text);
    this.setState({ text: '' });
  }

  setStatus = (state) => {
    this.state.stompClient.setStatus(state);
    // Force redraw
    this.setState({});
  }

  handleLogin() {
    const client = new SimbaJS(config.activemq);
    this.setState({ stompClient: client });
    client.connect();

    client.onSimbaStatusChange(simbaStatus => {
      this.setState({ simbaStatus });
      if (SIMBA_STATUS_MESSAGES[simbaStatus]) {
        const { message, type } = SIMBA_STATUS_MESSAGES[simbaStatus];
        if (type === 'SUCCESS') {
          NotificationManager.success(message);
        } else if (type === 'ERROR') {
          NotificationManager.error(message);
        } else {
          NotificationManager.info(message);
        }
        // Force re-render
        this.setState({});
      }
    });
    client.subscribe(message => {
      this.setState({ tasks: client.getTasks() });
    })
  }

  handleLogout() {
    const client = this.state.stompClient;
    client.setStatus(EOS_STATUS.OFFLINE);
    client.disconnect();
  }

  handleRefreshTasks() {
    const client = this.state.stompClient;
    const tasks = client.getTasks();
    this.setState({ tasks });
  }

  handleCompleteTask(taskId) {
    const client = this.state.stompClient;
    client.processTask(taskId);
    this.setState({ tasks: client.getTasks() });
  }
  render() {
    const client = this.state.stompClient;
    const loggedIn = [STOMP_STATUS.CONNECTED].includes(client.status);
    return (
      <Container>
        <Form>
          <FormGroup>
            {!loggedIn && <Button onClick={this.handleLogin} disabled={client.status === STOMP_STATUS.CONNECTING}>Login</Button>}
            {loggedIn && <Button onClick={() => this.setStatus(EOS_STATUS.ONLINE)} color={client.eosStatus === EOS_STATUS.ONLINE ? 'success' : 'secondary'} disabled={client.eosStatus === EOS_STATUS.ONLINE}>Online</Button>}
            {loggedIn && <Button onClick={() => this.setStatus(EOS_STATUS.OFFLINE)} color={client.eosStatus === EOS_STATUS.OFFLINE ? 'success' : 'secondary'} disabled={client.eosStatus === EOS_STATUS.OFFLINE}>Offline</Button>}
            {loggedIn && <Button onClick={() => this.setStatus(EOS_STATUS.AWAY)} color={client.eosStatus === EOS_STATUS.AWAY ? 'success' : 'secondary'} disabled={client.eosStatus === EOS_STATUS.AWAY}>Away</Button>}
            {loggedIn && <Button onClick={() => this.setStatus(EOS_STATUS.BUSY)} color={client.eosStatus === EOS_STATUS.BUSY ? 'success' : 'secondary'} disabled={client.eosStatus === EOS_STATUS.BUSY}>Busy</Button>}
            {[STOMP_STATUS.CONNECTED].includes(client.status) && <Button onClick={this.handleLogout}>Logout</Button>}
          </FormGroup>
          {
            loggedIn && <div>
              <FormGroup row className="text-right">
                <Label>Task String</Label>
                <Input onChange={this.handleInputChange} value={this.state.text} />
              </FormGroup>
              <FormGroup row className="pull-right">
                <Button onClick={this.handleSubmit}>Send</Button>
              </FormGroup>
              <FormGroup>
                {this.state.tasks.map(task => <Row key={task.id}>
                  <Col>
                    <p>{JSON.stringify(task.task)}</p>
                  </Col>
                  <Col>
                    <Button color={!task.processed ? 'primary' : 'secondary'}
                      onClick={() => this.handleCompleteTask(task.id)}
                      disabled={task.processed}
                    >Complete</Button>
                  </Col>
                </Row>)}
              </FormGroup>
            </div>
          }

        </Form>
      </Container>
    );
  }
}