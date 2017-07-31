import {NetInfo} from 'react-native'
import _runWhenOnline from './runWhenOnline'

export const runWhenOnline = _runWhenOnline(NetInfo)