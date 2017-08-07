# react-native-persistent-job 
  
[![NPM version](https://img.shields.io/npm/v/react-native-persistent-job.svg)](https://www.npmjs.com/package/react-native-persistent-job)
  
* Run parametized asynchronous functions (called `jobs`) that will re-run in cases of failure, connection loss, application crash or user forced shutdowns.  
* <b>Runs on both android and iOS.</b>  

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

There are 2 main apis. One for initialization, registering job types and applying modifiers (`initializeApp`) and one for running jobs (`runJob`).

### `initializeApp`
`initializeApp` is used to set up options & run stored jobs.
As soon as `initializeApp` is called the stored jobs that did not finish execution run.  
To run any kind of persistent job you must call `initializeApp` first.  
  
<b>Arguments</b>:  
* `storeName: string` - optional store name that identifies your instance when you call runJob
* `jobHandlers: Array<{jobType: string, handleFunction: (...args: any) => Promise<void>}>` - an array of job type (the key that identifies the job) and an handle function to run when the job type is called
* `modifyJobStream: Rx.Observable<JobNumbered> => RxObservable<JobNumbered>` - Modifies the stream that runs the jobs (more on that later in the readme)
* `modifyRetryStream: Rx.Observable<JobNumbered> => RxObservable<JobNumbered>` - Modifies the stream that retries the jobs (more on that later in the readme)

### `runJob`
`runJob` is used to run the jobs, it accepts the job type as first argument and all the next arguments are the normal arguments that the function that is being ran accepts.  
For example if I want to run a function `(a, b, c) => console.log(a, b, c)` that has a jobType `console` I will run it like this: `persistentJob.app().runJob('console', 'valueForA', 'valueForB', 'valueForC')`    
  
<b>Arguments</b>:   
* `jobType: string` - the job type for the job you want to run that you registered beforehand in `initializeApp` with the `jobHandlers` param
* `...args: any[]` - the args that the function accepts

### example for `initializeApp` and `runJob`

```js
import persistentJob from 'react-native-persistent-job'

const logIt = (a, b, c) => console.log(a, b, c)

await persistentJob.initializeApp({
	jobHandlers: [{jobType: 'logIt', handleFunction: logIt}]
})

persistentJob.app().runJob('logIt', 'valueForA', ''valueForB', ''valueForC')
persistentJob.app().runJob('logIt', 'AnotherValueForA', ''AnotherValueForB', ''AnotherValueForC')
```

## Job & Retry streams
The jobs run on a stream that can be modified using rx. There are some built-in modifiers which can be used to modify the stream.

### `runWhenOnline`
Will only run the jobs once the device is connected to the internet.

* example
```js
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
```js
streamModifiers.retryStream.withBackoff.{exponential / fibonacci}(initialWaitTime: number, maxWaitTime?: number)
```

* Example:

```js
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
```js
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
persistentJob.app('stateless-stateful').runJob('stateful', 'mary')
```
