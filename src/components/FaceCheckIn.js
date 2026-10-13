import React, {useEffect, useRef, useState} from 'react';
import {ActivityIndicator, Pressable, StyleSheet, Text, View} from 'react-native';
import FaceCamera from './FaceCamera';
import {getCompanyFaces} from '../services/FaceApiService';
import faceRecognitionService from '../services/faceRecognitionService';
import {findBestEmployeeMatch} from '../services/faceMatchingService';
import {createFaceCheckInController} from '../services/faceCheckInService';

// Mount within the attendance flow with authenticated company/location context.
// Remount with a new key to start a new employee session.
const FaceCheckIn = ({companyId, checkLocation, onCancel}) => {
  const [employees, setEmployees] = useState(null);
  const [state, setState] = useState({status: 'identifying'});
  const [error, setError] = useState('');
  const controller = useRef(null);
  useEffect(() => {
    let active = true;
    controller.current = createFaceCheckInController({companyId, checkLocation, onState: next => { if (active) setState(next); }});
    setEmployees(null);
    setState({status: 'identifying'});
    setError('');
    Promise.all([getCompanyFaces(companyId), faceRecognitionService.loadModel()])
      .then(([records]) => { if (active) setEmployees(records); })
      .catch(failure => { if (active) setError(failure.message); });
    return () => { active = false; };
  }, [companyId, checkLocation]);
  const identify = embedding => controller.current.identify(findBestEmployeeMatch(embedding, employees));
  if (!employees) return <View><ActivityIndicator /><Text>{error || 'Preparing face check-in'}</Text></View>;
  return (
    <View style={styles.root}>
      <FaceCamera mode="recognition" isPaused={state.status !== 'identifying'} onCancel={onCancel} onComplete={identify} onError={failure => setError(failure.message)} />
      {!!error && <Text style={styles.message}>{error}</Text>}
      {state.match && <View style={styles.result}>
        <Text>{state.match.employeeName} · Employee {state.match.employeeId}</Text>
        <Text>Match score: {state.match.score.toFixed(3)}</Text>
        <Text>{state.status === 'success' ? 'Check-In Successful' : state.status === 'failed' ? 'Face verified successfully. Unable to complete check-in. Please try again.' : 'Face verified. Checking in…'}</Text>
        {state.status === 'submitting' && <ActivityIndicator />}
        {state.status === 'failed' && <>
          <Text>{state.error}</Text>
          <Pressable accessibilityRole="button" onPress={() => controller.current.retry()}><Text>Retry check-in</Text></Pressable>
        </>}
      </View>}
    </View>
  );
};
const styles = StyleSheet.create({root: {flex: 1}, message: {backgroundColor: 'white', padding: 12}, result: {backgroundColor: 'white', bottom: 0, left: 0, padding: 20, position: 'absolute', right: 0}});
export default FaceCheckIn;
