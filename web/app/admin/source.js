// @flow

import React from 'react'
import Promise from 'bluebird'
import Router from 'react-router'

import {SourceModel, emptySource, emptyScan, Status} from '../model/source'
import {ChapterModel} from '../model/chapter'
import {toDateString} from '../helpers'
import {Chapters} from './chapters'
import {ImportSettings} from './import'
import {DisabledButton, FormSection} from '../comp'
import {statusColor} from '../books/book'

import {coverStyle, Cover} from '../cover'
import {makeUpdate, checked} from '../data/update'

export class Source extends React.Component {

  static load(params) {
    if (params.id == "new") {
      return {source: emptySource(), chapters:[]}
    }

    return {
      source: SourceModel.find(params.id),
      chapters: ChapterModel.findBySource(params.id),
    }
  }

  constructor(props) {
    super(props)
    this.state = {source: emptySource(), scanning: false, chapters: []}
  }

  componentWillReceiveProps(props) {
    this.setState({
      // store them locally so you can refresh them!
      source: props.source || emptySource(),
      chapters: props.chapters || []
    })
  }


  onSaveClick() {
    if (this.props.params.id == "new") {
      this.create()
    }

    else {
      this.save()
    }
  }

  onSaveChapter(chapter) {
    ChapterModel.save(chapter)
    .then(this.reloadChapters.bind(this))
  }

  reloadChapters() {
    return ChapterModel.findBySource(this.props.params.id)
    .then((chapters) => {
      this.setState({chapters: chapters})
    })
  }

  onClearChapter(chapter) {
    ChapterModel.clear(chapter)
    .then(this.reloadChapters.bind(this))
  }

  onHiddenChapter(chapter, hidden) {
    ChapterModel.hidden(chapter, hidden)
    .then(this.reloadChapters.bind(this))
  }

  save() {
    var source = this.state.source
    SourceModel.save(this.props.source.id, source)
    .then(() => window.location.hash = "/admin/sources")
  }

  create() {
    var source = this.state.source
    SourceModel.create(source)
    .then(() => window.location.hash = "/admin/sources")
  }

  runScan() {
    this.setState({scanning: true})
    ChapterModel.importSource(this.props.params.id)
    .then(() => {
      this.setState({scanning: false})
    })
    .then(this.reloadChapters.bind(this))
  }

  deleteAllChapters() {
    ChapterModel.deleteBySource(this.props.params.id)
    .then(this.reloadChapters.bind(this))
  }

  onUpdateSettings(settings) {
    var source = this.state.source
    source.importSettings = settings
    this.setState({source: source})
  }

  render() {
    var source:Source = this.state.source || {}
    var chapters = this.state.chapters || []
    var lastScan = source.lastScan || emptyScan()

    var scanningDisabled = (this.state.scanning) ? "disabled" : ""
    var scanningText = (this.state.scanning) ? "Scanning..." : "Scan Now"

    var update = makeUpdate(source, (v) => {
      this.setState({source: v})
    })

    return <div>
      <h3>Source</h3>

      <div>
        <button className="" onClick={this.onSaveClick.bind(this)}>Save</button>
        <span> </span>
        <a className="secondary button" href="#/admin/sources">Cancel</a>
      </div>

      <FormSection title="Basic Settings">
        <div>
          <div style={{float: 'left', width: 170}}>
            <Cover source={source} />
          </div>

          <div style={{marginLeft: 170, minHeight: 305}}>
            <label>Name</label>
            <input type="text"
              value={source.name}
              onChange={update((s, v) => s.name = v)}
            />
            <label>Author</label>
            <input type="text"
              value={source.author}
              onChange={update((s, v) => s.author = v)}
            />

              <label>Status</label>
              <select
                value={source.status}
                onChange={update((s, v) => s.status = v)}
              >
                <option value={Status.Active}>{Status.Active}</option>
                <option value={Status.Complete}>{Status.Complete}</option>
                <option value={Status.Disabled}>{Status.Disabled}</option>
                <option value={Status.Abandoned}>{Status.Abandoned}</option>
              </select>

            <label>URL</label>
            <input type="text"
              value={source.url}
              onChange={update((s, v) => s.url = v)}
            />
            <label>Image URL</label>
            <input type="text"
              value={source.imageUrl}
              onChange={update((s, v) => s.imageUrl = v)}
            />

            <div>
              <label>Image Missing Title</label>
              <input type="checkbox"
                checked={source.imageMissingTitle}
                onChange={update((s, v) => s.imageMissingTitle = v, checked)}
              />
            </div>
          </div>
        </div>

      </FormSection>

      <FormSection title="Import Settings">
        <ImportSettings settings={source.importSettings} onUpdate={this.onUpdateSettings.bind(this)} />
      </FormSection>

      <h4>{chapters.length} Chapters</h4>

      <div>
        Last Scan
        <ul>
          <li>Date: {toDateString(lastScan.date)}</li>
          <li>Total: {lastScan.total}</li>
          <li>New: {lastScan.new.length}</li>
          <li>Updated: {lastScan.updated.length}</li>
        </ul>
      </div>

      <div>
        <button className={scanningDisabled} onClick={this.runScan.bind(this)}>{scanningText}</button>
        <span> </span>
        <button className="secondary" onClick={this.deleteAllChapters.bind(this)}>Delete All</button>
      </div>

      <Chapters chapters={chapters} source={source} 
        onSaveChapter={this.onSaveChapter.bind(this)}
        onClearChapter={this.onClearChapter.bind(this)}
        onHiddenChange={this.onHiddenChapter.bind(this)}
      />
    </div>

  }
}
