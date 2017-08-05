# react-native-persistent-job 
  
[![NPM version](https://img.shields.io/npm/v/react-native-persistent-job.svg)](https://www.npmjs.com/package/react-native-persistent-job)
  
Run parametized asynchronous functions (called `jobs`) that will re-run in cases of failure, connection loss, application crash or user forced shutdowns. 

## Why?

When you develop an application you usually focus on the 'happy flow', where everything runs smoothly, the user has perfect connection, he only leaves the app through the exit button, the app never crashes and your backend or any of the services you use never fail.   
Well... it is not usually like that.   
Things will fail and might leave your application in an unstable state.  
This repository aims to help deal with that. 

## Installation

Install package from npm

```sh
npm install --save react-native-persistent-job
```


## Usage

There are 2 main apis. One for registering job (`initializeApp`) types and one for running them (`runJob`).

* example:

```
import persistentJob from 'react-native-persistent-job'

... 

await persistentJob.initializeApp({
	jobHandlers: [{jobType: 'sleepAndWarn', handleFunction: sleepAndWarn}]
})

persistentJob.app().runJob('sleepAndWarn', 'hello after one second', 1000)
persistentJob.app().runJob('sleepAndWarn', 'goodBye after ten seconds', 10000)
```

## Job & Retry streams
The jobs run on a stream that can be modified using rx. There are some built-in modifiers which can be used to modify the stream.

### `runWhenOnline`
Will only run the jobs once the device is connected to the internet.

* example
```
import persistentJob, {streamModifiers} from 'react-native-persistent-job'

...

await persistentJob.initializeApp({
	storeName: 'online-jobs',
	jobHandlers: [{jobType: 'sleepAndWarn', handleFunction: sleepAndWarn}]
	modifyJobStream: streamModifiers.runWhenOnline
})

persistentJob.app('online-jobs').runJob('sleepAndWarn', 'I will only run online after one second', 1000)
persistentJob.app('online-jobs').runJob('sleepAndWarn', 'I will only run online after two seconds', 2000)
```

### `withBackoff`
Will run failed jobs with delay based on a backoff method (right now either exponential or fibonacci)

* Api:
```
streamModifiers.retryStream.withBackoff.{exponential / fibonacci}(initialWaitTime: number, maxWaitTime?: number)
```

* Example:

```
import persistentJob, {streamModifiers} from 'react-native-persistent-job' 

...

await persistentJob.initializeApp({
	storeName: 'failing-jobs',
	jobHandlers: [{jobType: 'failureOfAJob', handleFunction: failureOfAJob}]
	modifyRetryStream: streamModifiers.retryStream.withBackoff.exponential(10, 50)
})

persistentJob.app('failing-jobs').runJob('failureOfAJob', 'I will fail while running')
```

## Stateful & stateless jobs
Usually you will want to use stateless jobs.  
Sometimes however, it is more convenient for a job to have a state, then whenever it runs after a failure it will remember the last state it was at.  
To do that your function will have to have a prefix with 2 arguments `currentState` and `updateState`.  
Here is an example with both a stateless and a stateful job:
```
	const statelessJob = async (name) => {
		for (let i = 0; i < 10; i++) {
			console.log('Hello name', i)
		}
	}

	const statefulJob = (currentState, updateState) => async (name) => {
		const start = currentState || 0
		for (let i = start; i < 10; i++) {
			console.log('Hello name', i)
			await updateState(i)
		}
	}

	await persistentJob.initializeApp({
		storeName: 'stateless-stateful',
		jobHandlers: [
			{jobType: 'stateless', handleFunction: statelessJob},
			{jobType: 'stateful', handleFunction: statefulJob, isStateful: true}
		]
	})

	persistentJob.app('stateless-stateful').runJob('stateless', 'john')
	persistentJob.app('stateless-stateful').runJob('stateful', 'marry')
```
