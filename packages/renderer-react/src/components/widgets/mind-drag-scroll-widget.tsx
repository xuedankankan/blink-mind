import { Controller, DocModel, FocusMode, SheetModel } from '@blink-mind/core';
import { Hotkey, Hotkeys, HotkeysTarget } from '@blueprintjs/core';
import * as React from 'react';
import styled from 'styled-components';
import { HotKeysConfig } from '../../types';
import { EventKey, RefKey, topicNodeRefKey } from '../../utils';
import { DragScrollWidget } from '../common';
const NodeLayer = styled.div`
  position: relative;
  display: flex;
  align-items: center;
  padding: 5px;
  background: ${props => props.theme.background};
`;

const DIV = styled.div`
  width: 100%;
  height: 100%;
`;

export interface MindDragScrollWidgetProps {
  controller?: Controller;
  model: SheetModel;
  docModel: DocModel;
  saveRef?: Function;
  getRef?: Function;
}

@HotkeysTarget
class MindDragScrollWidget<
  P extends MindDragScrollWidgetProps
> extends React.PureComponent<MindDragScrollWidgetProps> {
  constructor(props: MindDragScrollWidgetProps) {
    super(props);
  }

  renderHotkeys() {
    const props = this.props;
    const { controller, model, docModel } = props;
    if (docModel.currentSheetModel !== model) return <Hotkeys />;
    const hotKeys: HotKeysConfig = controller.run('customizeHotKeys', props);
    if (hotKeys === null) return null;
    if (
      !(
        hotKeys.topicHotKeys instanceof Map &&
        hotKeys.globalHotKeys instanceof Map
      )
    ) {
      throw new TypeError('topicHotKeys and globalHotKeys must be a Map');
    }
    const children = [];
    if (
      model.focusMode === FocusMode.NORMAL ||
      model.focusMode === FocusMode.SHOW_POPUP
    ) {
      hotKeys.topicHotKeys.forEach((v, k) => {
        children.push(<Hotkey key={k} {...v} global />);
      });
    }
    hotKeys.globalHotKeys.forEach((v, k) => {
      children.push(<Hotkey key={k} {...v} global />);
    });
    return <Hotkeys>{children}</Hotkeys>;
  }

  componentDidMount(): void {
    const { getRef, docModel, model, controller } = this.props;
    controller.run('addZoomFactorChangeEventListener', {
      ...this.props,
      listener: this.setZoomFactor
    });
    const rootTopic: HTMLElement = getRef(
      topicNodeRefKey(model.editorRootTopicKey)
    );
    //TODO
    const nodeLayer: HTMLElement = getRef(RefKey.NODE_LAYER + model.id);
    const rootTopicRect = rootTopic.getBoundingClientRect();
    const nodeLayerRect = nodeLayer.getBoundingClientRect();
    this.dragScrollWidget.setViewBoxScrollDelta(
      0,
      rootTopicRect.top -
        nodeLayerRect.top -
        this.dragScrollWidget.viewBox.getBoundingClientRect().height / 2 +
        rootTopicRect.height
    );
    //为了解决缩放之后切换到其他显示模式, 再次切换回去会错乱
    this.setZoomFactor(controller.run('getZoomFactor', this.props));
    this.layout();
    setTimeout(() => {
      docModel.currentSheetModel === model &&
        controller.run('moveTopicToCenter', {
          ...this.props,
          topicKey: model.focusKey
        });
    });
  }

  componentWillUnmount(): void {
    const { controller } = this.props;
    controller.run('removeZoomFactorChangeEventListener', {
      ...this.props,
      listener: this.setZoomFactor
    });
  }

  get dragScrollWidget(): DragScrollWidget {
    const { getRef, model } = this.props;
    return getRef(RefKey.DRAG_SCROLL_WIDGET_KEY + model.id);
  }

  componentDidUpdate(): void {
    const { controller } = this.props;
    controller.run('fireEvent', {
      ...this.props,
      key: EventKey.CENTER_ROOT_TOPIC
    });
    this.layout();
  }

  layout() {
    const { controller } = this.props;
    controller.run('layout', this.props);
  }

  setZoomFactor = zoomFactor => {
    this.dragScrollWidget.setZoomFactor(zoomFactor);
  };

  onWheel = ev => {
    const { controller } = this.props;
    controller.run('setZoomFactorOnWheel', { ...this.props, ev });
  };

  render() {
    const { saveRef, model, controller } = this.props;
    const topicKey = model.editorRootTopicKey;
    const topic = model.getTopic(topicKey);
    return (
      <DIV onWheel={this.onWheel}>
        <DragScrollWidget
          {...this.state}
          enableMouseWheel={false}
          ref={saveRef(RefKey.DRAG_SCROLL_WIDGET_KEY + model.id)}
        >
          {(
            setViewBoxScroll: (left: number, top: number) => void,
            setViewBoxScrollDelta: (left: number, top: number) => void
          ) => {
            const rootWidgetProps = {
              ...this.props,
              topicKey,
              topic,
              setViewBoxScroll,
              setViewBoxScrollDelta
            };
            return (
              <NodeLayer ref={saveRef(RefKey.NODE_LAYER + model.id)}>
                {controller.run('renderRootWidget', rootWidgetProps)}
              </NodeLayer>
            );
          }}
        </DragScrollWidget>
      </DIV>
    );
  }
}

export { MindDragScrollWidget };
