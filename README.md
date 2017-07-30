# Usage

```
import persistentJob from 'react-native-persistent-job'
import AsyncStorage from 'react-native'

... 

await persistentJob.initializeApp({
	jobHandlers: [{jobType: 'sleepAndWarn', handleFunction: sleepAndWarn}], 
	asyncStorage: AsyncStorage
})

persistentJob.app().runJob('sleepAndWarn', 'hello after one second', 1000)
persistentJob.app().runJob('sleepAndWarn', 'goodBye after ten seconds', 10000)
```

## Jobs are persisted as soon as `runJob` is called. 
## If the app crushes the jobs that did not finish will re-run after restart.

# Easily extendable with rx
The jobs run on a stream that can be modified using rx. There are some built-in modifiers (currently only one) which can be used to modify the stream.

## runWhenOnline
Will only run the jobs once the device is connected to the internet.

```
import persistentJob, {streamModifiers} from 'react-native-persistent-job'
import AsyncStorage from 'react-native'

...

await persistentJob.initializeApp({
	storeName: 'online-jobs',
	jobHandlers: [{jobType: 'sleepAndWarn', handleFunction: sleepAndWarn}],
	asyncStorage: AsyncStorage,
	modifyJobStream: streamModifiers.runWhenOnline(NetInfo)(x => x)
})

persistentJob.app('online-jobs').runJob('sleepAndWarn', 'I will only run online after one second', 1000)
persistentJob.app('online-jobs').runJob('sleepAndWarn', 'I will only run online after two seconds', 2000)
```
