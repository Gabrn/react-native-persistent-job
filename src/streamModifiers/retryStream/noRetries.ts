import {Observable} from 'rxjs'
import {JobNumbered} from '../../jobTypes'

export default (obs: Observable<JobNumbered>) => obs.filter(_ => false)