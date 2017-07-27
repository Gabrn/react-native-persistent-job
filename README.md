# Usage

still a work in progress
```
import persistentJob from 'react-native-persistent-job'

... 

await persistentJob.initializeApp({
	jobHandlers: [{jobType: 'sleepAndWarn', handleFunction: sleepAndWarn}], 
	asyncStorage: AsyncStorage
})

persistentJob.app().runJob('sleepAndWarn', 'hello after one second', 1000)
persistentJob.app().runJob('sleepAndWarn', 'goodBye after ten seconds', 10000)
```

## Jobs are persisted as soon as `runJob` is called. 
## If the app crushes the jobs will re-run after restart.
## If the job fails it will rerun
## Uses rx subjects to control the run flow of the jobs
