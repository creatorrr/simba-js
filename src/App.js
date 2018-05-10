import React, { Component } from 'react';
import {BrowserRouter as Router, Route, Switch} from 'react-router-dom';
import {NotificationContainer, NotificationManager} from 'react-notifications';
import Main from './views/main';
import logo from './logo.svg';
import './App.css';
import './styles/index.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'react-notifications/lib/notifications.css';
// const type = require('type');
class App extends Component {
  constructor(props) {
    super(props);
    this.state = {};
    
  }
  componentWillMount() {

  }
  render() {
    return (
      <div className="App">
        <header className="App-header">
        </header>
        <Router>
          <Switch>
            <Route path="/" component={Main}/>
          </Switch>
        </Router>
        <NotificationContainer/>
      </div>
    );
  }
}

export default App;
