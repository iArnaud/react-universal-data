// @flow

import React, { PureComponent } from 'react'
import PropTypes from 'prop-types'
import { shallowEqual, wrapDisplayName } from 'recompose'
import { isClient, isServer } from './constants'
import { DataConsumer } from './context'
import { defaultDataStore } from './data-store'

import type {
  DataStoreType,
  DataCompChildType,
  DataCompStateType
} from './types'

const defaultGetData = () => Promise.resolve()

const defaultShouldDataUpdate = (prev, next) => {
  if (prev.match && prev.location) {
    return !(
      shallowEqual(prev.match.params, next.match.params) &&
      prev.location.pathname === next.location.pathname &&
      prev.location.search === next.location.search
    )
  }

  return false
}

const defaultMergeProps = ({ dataStore, ...ownProps }, stateProps) => ({
  ...ownProps,
  ...stateProps.data,
  isLoading: ownProps.isLoading || stateProps.isLoading,
  error: stateProps.error || ownProps.error || null
})

const withData = (
  optGetData: Function,
  shouldDataUpdate: Function = defaultShouldDataUpdate,
  mergeProps: Function = defaultMergeProps
) => (BaseComponent: DataCompChildType) => {
  let id = 0

  const getDataPromise = optGetData || BaseComponent.getData || defaultGetData
  const getData = (context) => {
    const promise = getDataPromise({ isClient, isServer, ...context })

    promise.then((data) => context.dataStore.save(id, data))

    return promise
  }

  class Data extends PureComponent<{ dataStore: DataStoreType }, DataCompStateType> {
    static displayName = wrapDisplayName(
      BaseComponent,
      'withData'
    )
    static defaultProps = {
      dataStore: defaultDataStore
    }
    static propTypes = {
      dataStore: PropTypes.shape({
        nextId: PropTypes.func.isRequired,
        getById: PropTypes.func.isRequired
      })
    }
    constructor (props) {
      super(props)

      if (!id) {
        id = props.dataStore.nextId()
      }

      this.state = {
        isLoading: false,
        error: null,
        data: props.dataStore.getById(id)
      }
    }
    getInitialData = (context) => getData({
      ...context,
      ...this.props
    })
    handleRequest = (promise) => {
      this.setState({ isLoading: true })

      promise
        .then((data) => this.setState({ isLoading: false, data }))
        .catch((error) => this.setState({ isLoading: false, error }))

      return promise
    }
    componentDidMount () {
      if (this.props.dataStore.getById(id) == null) {
        this.handleRequest(getData(this.props))
      }
    }
    componentDidUpdate (prevProps) {
      if (shouldDataUpdate(prevProps, this.props)) {
        this.handleRequest(getData(this.props))
      }
    }
    render () {
      return (
        <BaseComponent {...mergeProps(this.props, this.state)} />
      )
    }
  }

  return (props: Object) => (
    <DataConsumer>
      {(dataStore: DataStoreType) => <Data {...props} dataStore={dataStore} />}
    </DataConsumer>
  )
}

export {
  withData
}
