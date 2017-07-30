import {Subject} from 'rxjs'
import {JobNumbered} from '../jobTypes'

export type StreamModifier = (subject: Subject<JobNumbered>) => Subject<JobNumbered>