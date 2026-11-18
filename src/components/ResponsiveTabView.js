import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import {TabBar, TabView} from 'react-native-tab-view';

const clampIndex = (value, routeCount) =>
  Math.max(0, Math.min(Number(value) || 0, Math.max(0, routeCount - 1)));

/**
 * Responsive, reusable wrapper around react-native-tab-view.
 * Routes require `key` and should normally include a human-readable `title`.
 */
const ResponsiveTabView = ({
  routes,
  renderScene,
  initialIndex = 0,
  onIndexChange,
  tabBarStyle,
  renderLabel,
  swipeEnabled = true,
  scrollEnabled,
  lazy = true,
}) => {
  const {width, height} = useWindowDimensions();
  const routeCount = routes?.length || 0;
  const [index, setIndex] = useState(() => clampIndex(initialIndex, routeCount));
  const isTablet = Math.min(width, height) >= 600;
  const longestTitleLength = Math.max(
    0,
    ...(routes || []).map(route => String(route.title || route.key).length),
  );
  const hasLongLabel = longestTitleLength > (isTablet ? 18 : 14);
  const shouldScroll =
    typeof scrollEnabled === 'boolean'
      ? scrollEnabled
      : routeCount > (isTablet ? 5 : 3) || hasLongLabel;
  const tabWidth = Math.max(
    isTablet ? 144 : 112,
    longestTitleLength * (isTablet ? 8.5 : 7.5) + 40,
  );

  useEffect(() => {
    setIndex(current => clampIndex(current, routeCount));
  }, [routeCount]);

  useEffect(() => {
    setIndex(clampIndex(initialIndex, routeCount));
  }, [initialIndex, routeCount]);

  const navigationState = useMemo(() => ({index, routes: routes || []}), [index, routes]);

  const handleIndexChange = useCallback(
    nextIndex => {
      const safeIndex = clampIndex(nextIndex, routeCount);
      setIndex(safeIndex);
      onIndexChange?.(safeIndex);
    },
    [onIndexChange, routeCount],
  );

  const options = useMemo(
    () =>
      Object.fromEntries(
        (routes || []).map(route => [
          route.key,
          {
            labelText: route.title || route.key,
            ...(renderLabel
              ? {label: renderLabel}
              : {
                  labelStyle: [
                    styles.label,
                    isTablet ? styles.tabletLabel : styles.phoneLabel,
                  ],
                }),
          },
        ]),
      ),
    [isTablet, renderLabel, routes],
  );

  const renderTabBar = useCallback(
    props => (
      <TabBar
        {...props}
        scrollEnabled={shouldScroll}
        activeColor="#07583C"
        inactiveColor="#718078"
        pressColor="#07583C1A"
        gap={0}
        style={[styles.tabBar, tabBarStyle]}
        indicatorStyle={styles.indicator}
        contentContainerStyle={
          shouldScroll ? styles.scrollableTabs : styles.equalWidthTabs
        }
        tabStyle={[
          styles.tab,
          shouldScroll ? {width: tabWidth} : styles.equalWidthTab,
        ]}
      />
    ),
    [shouldScroll, tabBarStyle, tabWidth],
  );

  if (!routeCount) {
    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyText}>No tabs are available.</Text>
      </View>
    );
  }

  return (
    <TabView
      navigationState={navigationState}
      renderScene={renderScene}
      onIndexChange={handleIndexChange}
      renderTabBar={renderTabBar}
      initialLayout={{width}}
      style={styles.container}
      swipeEnabled={swipeEnabled}
      lazy={lazy}
      lazyPreloadDistance={1}
      renderLazyPlaceholder={() => (
        <View style={styles.lazyPlaceholder}>
          <ActivityIndicator color="#07583C" />
        </View>
      )}
      options={options}
    />
  );
};

const styles = StyleSheet.create({
  container: {flex: 1},
  tabBar: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#DFEEE5',
    elevation: 0,
    shadowOpacity: 0,
  },
  tab: {minHeight: 48, paddingHorizontal: 8},
  equalWidthTabs: {flex: 1},
  equalWidthTab: {flex: 1},
  scrollableTabs: {paddingHorizontal: 4},
  indicator: {backgroundColor: '#07583C', height: 3, borderRadius: 3},
  label: {fontWeight: '700', textAlign: 'center', includeFontPadding: false},
  phoneLabel: {fontSize: 13},
  tabletLabel: {fontSize: 15},
  lazyPlaceholder: {flex: 1, alignItems: 'center', justifyContent: 'center'},
  emptyState: {flex: 1, alignItems: 'center', justifyContent: 'center'},
  emptyText: {color: '#718078'},
});

export default React.memo(ResponsiveTabView);
