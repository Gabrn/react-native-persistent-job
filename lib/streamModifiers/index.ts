import {NetInfo} from 'react-native'
import _runWhenOnline from './runWhenOnline'
import * as _retryStream from './retryStream'

export const runWhenOnline = _runWhenOnline(NetInfo)
export const retryStream = _retryStream