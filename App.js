/* eslint-disable react-native/no-inline-styles */
import React, {useCallback, useEffect, useRef, useState} from 'react';
import {
  Animated,
  FlatList,
  PanResponder,
  StyleSheet,
  Text,
  View,
} from 'react-native';

function mutableMove(array, from, to) {
  if (from === to) {
    return array;
  }

  const target = array[from];
  const increment = to < from ? -1 : 1;

  for (let k = from; k !== to; k += increment) {
    array[k] = array[k + increment];
  }
  array[to] = target;
  return array;
}

const colorMap = Object.freeze({
  0: 'red',
  1: 'orange',
  2: 'yellow',
  3: 'blue',
  4: 'green',
});

export default function App() {
  const [state, setState] = useState({
    dragging: false,
    draggingIdx: -1,
    data: [0, 1, 2, 3, 4],
  });

  useEffect(() => animateList(), [animateList, state]);

  const point = useRef(new Animated.ValueXY()).current;

  const currentY = useRef(0);
  const scrollOffset = useRef(0);
  const flatlistTopOffset = useRef(0);
  const rowHeight = useRef(0);
  const currentIdx = useRef(-1);
  const active = useRef(false);

  const _panResponder = useRef(
    PanResponder.create({
      // Ask to be the responder:
      onStartShouldSetPanResponder: (evt, gestureState) => true,
      onStartShouldSetPanResponderCapture: (evt, gestureState) => true,
      onMoveShouldSetPanResponder: (evt, gestureState) => true,
      onMoveShouldSetPanResponderCapture: (evt, gestureState) => true,

      onPanResponderGrant: (evt, gestureState) => {
        // The gesture has started. Show visual feedback so the user knows
        // what is happening!
        // gestureState.d{x,y} will be set to zero now
        currentIdx.current = yToIndex(gestureState.y0);
        currentY.current = gestureState.y0;
        Animated.event([{y: point.y}], {useNativeDriver: false})({
          y: gestureState.y0,
        });
        active.current = true;
        setState(prev => ({
          ...prev,
          dragging: true,
          draggingIdx: currentIdx.current,
        }));
      },
      onPanResponderMove: (evt, gestureState) => {
        currentY.current = gestureState.moveY;
        Animated.event([{y: point.y}], {useNativeDriver: false})({
          y: gestureState.moveY,
        });
        // The most recent move distance is gestureState.move{X,Y}
        // The accumulated gesture distance since becoming responder is
        // gestureState.d{x,y}
      },
      onPanResponderTerminationRequest: (evt, gestureState) => false,
      onPanResponderRelease: (evt, gestureState) => {
        // The user has released all touches while this view is the
        // responder. This typically means a gesture has succeeded
        reset();
      },
      onPanResponderTerminate: (evt, gestureState) => {
        // Another component has become the responder, so this gesture
        // should be cancelled
        reset();
      },
      onShouldBlockNativeResponder: (evt, gestureState) => {
        // Returns whether this component should block native components from becoming the JS
        // responder. Returns true by default. Is currently only supported on android.
        return true;
      },
    }),
  ).current;

  const animateList = useCallback(() => {
    if (!active.current) {
      return;
    }
    requestAnimationFrame(() => {
      // check y value see if we need to reorder
      const newIdx = yToIndex(currentY.current);
      if (currentIdx.current !== newIdx) {
        setState(prev => ({
          ...prev,
          data: mutableMove(state.data, currentIdx.current, newIdx),
          draggingIdx: newIdx,
        }));
        currentIdx.current = newIdx;
      }
      animateList();
    });
  }, [state.data, yToIndex]);

  const yToIndex = useCallback(
    y => {
      const value = Math.floor(
        (scrollOffset.current + y - flatlistTopOffset.current) /
          rowHeight.current,
      );
      if (value < 0) {
        return 0;
      }
      if (value > state.data.length - 1) {
        return state.data.length - 1;
      }
      return value;
    },
    [state.data.length],
  );

  const reset = () => {
    active.current = false;
    setState(prev => ({...prev, dragging: false, draggingIdx: -1}));
  };

  const renderItem = ({item, index}, noPanResponder = false) => (
    <View
      onLayout={e => {
        rowHeight.current = e.nativeEvent.layout.height;
      }}
      style={{
        padding: 16,
        backgroundColor: colorMap[item],
        flexDirection: 'row',
        opacity: state.draggingIdx === index ? 0 : 1,
      }}>
      <View {...(noPanResponder ? {} : _panResponder.panHandlers)}>
        <Text>@</Text>
      </View>
      <Text style={{textAlign: 'center', flex: 1}}>{item}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      {state.dragging && (
        <Animated.View
          style={{
            position: 'absolute',
            zIndex: 5,
            width: '100%',
            top: point.getLayout().top,
          }}>
          {renderItem({item: state.data[state.draggingIdx], index: -1}, true)}
        </Animated.View>
      )}
      <FlatList
        scrollEnabled={!state.dragging}
        style={{width: '100%'}}
        data={state.data}
        renderItem={renderItem}
        onScroll={e => {
          scrollOffset.current = e.nativeEvent.contentOffset.y;
        }}
        onLayout={e => {
          flatlistTopOffset.current = e.nativeEvent.layout.y;
        }}
        scrollEventThrottle={100}
        keyExtractor={item => '' + item}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
