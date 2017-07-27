/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 * @flow
 */

import React, { Component } from 'react';
import {
  AppRegistry,
  StyleSheet,
  Text,
  View,
  AsyncStorage
} from 'react-native';
import persistentJob from 'react-native-persistent-job'

const sleep = time => new Promise(res => setTimeout(() => res(), time))
const sleepAndWarn = async (msg, time) => {
  await sleep(time)
  console.warn(msg)
}
export default class exampleReactNative extends Component {
  async componentDidMount() {
    await persistentJob.initializeApp({
      jobHandlers: [{jobType: 'sleepAndWarn', handleFunction: sleepAndWarn}], 
      asyncStorage: AsyncStorage
    })

    persistentJob.app().runJob('sleepAndWarn', 'hello after one second', 1000)
    persistentJob.app().runJob('sleepAndWarn', 'goodBye after ten seconds', 10000)
  }

  render() {
    return (
      <View style={styles.container}>
        <Text style={styles.welcome}>
          Welcome to React Native!
        </Text>
        <Text style={styles.instructions}>
          To get started, edit index.android.js
        </Text>
        <Text style={styles.instructions}>
          Double tap R on your keyboard to reload,{'\n'}
          Shake or press menu button for dev menu
        </Text>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5FCFF',
  },
  welcome: {
    fontSize: 20,
    textAlign: 'center',
    margin: 10,
  },
  instructions: {
    textAlign: 'center',
    color: '#333333',
    marginBottom: 5,
  },
});

AppRegistry.registerComponent('exampleReactNative', () => exampleReactNative);
