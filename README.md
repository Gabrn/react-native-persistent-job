# react-native-persistent-job

Run parametized jobs that will persist in storage and re-run in case they did not finish.
Jobs run on the 'job stream', which can be modified quite easily with rx, for controlling when and how the jobs will run.
Failed jobs go into the 'retry stream', which can also be modified the same way.

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