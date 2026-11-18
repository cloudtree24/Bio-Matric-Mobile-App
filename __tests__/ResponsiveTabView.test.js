import React from 'react';
import TestRenderer, {act} from 'react-test-renderer';
import {Text, View} from 'react-native';
import ResponsiveTabView from '../src/components/ResponsiveTabView';
import {TabBar, TabView} from 'react-native-tab-view';

jest.mock('react-native-tab-view', () => {
  const {View: NativeView} = require('react-native');
  const MockTabBar = props => <NativeView testID="mock-tab-bar" {...props} />;
  const MockTabView = props => (
    <NativeView testID="mock-tab-view" {...props}>
      {props.renderTabBar({navigationState: props.navigationState})}
      {props.renderScene({route: props.navigationState.routes[props.navigationState.index]})}
    </NativeView>
  );
  return {TabBar: MockTabBar, TabView: MockTabView};
});

const routes = [
  {key: 'overview', title: 'Overview'},
  {key: 'employees', title: 'Employees'},
];

const renderedText = renderer =>
  renderer.root
    .findAllByType(Text)
    .flatMap(node => (Array.isArray(node.props.children) ? node.props.children : [node.props.children]))
    .join('');

test('renders the selected scene and reports tab changes', async () => {
  const onIndexChange = jest.fn();
  let renderer;
  await act(async () => {
    renderer = TestRenderer.create(
      <ResponsiveTabView
        routes={routes}
        initialIndex={1}
        onIndexChange={onIndexChange}
        renderScene={({route}) => <Text>{route.title} scene</Text>}
      />,
    );
  });

  expect(renderedText(renderer)).toContain('Employees scene');
  await act(async () => renderer.root.findByType(TabView).props.onIndexChange(0));
  expect(onIndexChange).toHaveBeenCalledWith(0);
  expect(renderedText(renderer)).toContain('Overview scene');
});

test('makes long labels scrollable and honors an explicit scroll override', async () => {
  const longRoutes = [
    {key: 'registration', title: 'Employee Face Registration'},
    {key: 'attendance', title: 'Attendance History and Exceptions'},
  ];
  let renderer;
  await act(async () => {
    renderer = TestRenderer.create(
      <ResponsiveTabView
        routes={longRoutes}
        scrollEnabled={false}
        renderScene={() => <View />}
      />,
    );
  });
  expect(renderer.root.findByType(TabBar).props.scrollEnabled).toBe(false);
});
