import {Observable} from 'rxjs'
import {JobNumbered} from '../jobTypes'

export type StreamModifier = (subject: Observable<JobNumbered>) => Observable<JobNumbered>