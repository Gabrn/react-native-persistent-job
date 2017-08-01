# Usage

```
import persistentJob from 'react-native-persistent-job'

... 

await persistentJob.initializeApp({
	jobHandlers: [{jobType: 'sleepAndWarn', handleFunction: sleepAndWarn}]
})

persistentJob.app().runJob('sleepAndWarn', 'hello after one second', 1000)
persistentJob.app().runJob('sleepAndWarn', 'goodBye after ten seconds', 10000)
```

* Jobs are persisted as soon as `runJob` is called. 
* If the app crushes the jobs that did not finish will re-run after restart.

# Easily extendable with rx
The jobs run on a stream that can be modified using rx. There are some built-in modifiers which can be used to modify the stream.

## runWhenOnline
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

## withBackoff
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
	storeName: 'online-jobs',
	jobHandlers: [{jobType: 'sleepAndWarn', handleFunction: sleepAndWarn}]
	modifyRetryStream: streamModifiers.retryStream.withBackoff.exponential(10, 50)
})

persistentJob.app('online-jobs').runJob('sleepAndWarn', 'I will only run online after one second', 1000)
persistentJob.app('online-jobs').runJob('sleepAndWarn', 'I will only run online after two seconds', 2000)
```