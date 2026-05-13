import React, { useEffect, useMemo, useState } from 'react'
import L from 'leaflet'
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import api from '../lib/api'
import { toDisplayText } from '../lib/text'

const DEFAULT_CENTER = [14.987, 120.105]
const DEFAULT_ZOOM = 10
const CLUSTER_MIN_REPORTS = 3
const CLUSTER_EXPAND_ZOOM = 13

const MUNICIPALITIES = [
  { name: 'Olongapo', latitude: 14.8386, longitude: 120.2842 },
  { name: 'Subic', latitude: 14.8799, longitude: 120.2312 },
  { name: 'San Marcelino', latitude: 14.9742, longitude: 120.1579 },
  { name: 'San Antonio', latitude: 14.9471, longitude: 120.0897 },
  { name: 'San Narciso', latitude: 15.0167, longitude: 120.0833 },
  { name: 'San Felipe', latitude: 15.0622, longitude: 120.0708 },
  { name: 'Cabangan', latitude: 15.1673, longitude: 120.0334 },
]

function getReportCountColor(count) {
  if (count >= 20) return '#dc2626'
  if (count >= 10) return '#d6b44c'
  if (count >= 1) return '#1f6a53'
  return '#d8e0db'
}

function createReportDotIcon() {
  return L.divIcon({
    className: '',
    html: '<div style="width:18px;height:18px;border-radius:9999px;background:#0f5f46;border:4px solid #ffffff;box-shadow:0 8px 18px rgba(15,23,42,0.28);"></div>',
    iconSize: [18, 18],
    iconAnchor: [9, 9],
    popupAnchor: [0, -9],
  })
}

function createReportClusterIcon(count) {
  const color = getReportCountColor(count)
  return L.divIcon({
    className: '',
    html: `<div style="width:42px;height:42px;border-radius:9999px;display:grid;place-items:center;background:${color};border:5px solid #ffffff;box-shadow:0 12px 28px rgba(15,23,42,0.3);color:#ffffff;font:800 14px/1 system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">${count}</div>`,
    iconSize: [42, 42],
    iconAnchor: [21, 21],
    popupAnchor: [0, -21],
  })
}

function formatTimestamp(value) {
  if (!value) return 'No timestamp'
  return new Intl.DateTimeFormat('en-PH', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

function normalizeMediaUrl(url) {
  if (!url) return ''
  if (/^(https?:|blob:)/i.test(url)) return url

  const baseURL = api.defaults.baseURL || ''
  return `${baseURL}${url.startsWith('/') ? '' : '/'}${url}`
}

function getReportPosition(report) {
  const latitude = Number(report.latitude)
  const longitude = Number(report.longitude)

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null
  return [latitude, longitude]
}

function getClusterCenter(reports) {
  const totals = reports.reduce((sum, report) => {
    sum.latitude += report.position[0]
    sum.longitude += report.position[1]
    return sum
  }, { latitude: 0, longitude: 0 })

  return [totals.latitude / reports.length, totals.longitude / reports.length]
}

function DetailField({ label, children }) {
  return (
    <div className="rounded-[1.05rem] border border-[#dbe4df] bg-[#f8fbf9] px-4 py-4">
      <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-[#0f5f46]">{label}</p>
      <div className="mt-2 text-sm leading-6 text-slate-700">{children}</div>
    </div>
  )
}

function EvidencePreview({ report }) {
  const image = (report.evidence_media || []).find((media) => media.is_image && media.url)
  if (!image) return <span className="text-sm text-slate-400">No photo</span>

  const imageUrl = normalizeMediaUrl(image.url)
  return (
    <a href={imageUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-3">
      <img src={imageUrl} alt={`Evidence for ${toDisplayText(report.reference_number, 'report')}`} className="h-14 w-16 rounded-lg border border-[#dbe4df] object-cover shadow-sm" />
      <span className="text-sm font-semibold text-[#0f5f46] hover:underline">View photo</span>
    </a>
  )
}

function MapReportMarkers({ groupedReports, onSelectReport }) {
  const map = useMap()
  const [zoom, setZoom] = useState(map.getZoom())

  useEffect(() => {
    function handleZoomEnd() {
      setZoom(map.getZoom())
    }

    map.on('zoomend', handleZoomEnd)
    return () => map.off('zoomend', handleZoomEnd)
  }, [map])

  return groupedReports.flatMap((group) => {
    const shouldCluster = group.reports.length >= CLUSTER_MIN_REPORTS && zoom < CLUSTER_EXPAND_ZOOM

    if (shouldCluster) {
      const center = getClusterCenter(group.reports)
      return (
        <Marker
          key={`${group.municipality}-cluster`}
          position={center}
          icon={createReportClusterIcon(group.reports.length)}
          eventHandlers={{ click: () => map.setView(center, CLUSTER_EXPAND_ZOOM, { animate: true }) }}
        >
          <Popup>
            <div className="min-w-[190px] text-sm text-slate-700">
              <p className="font-bold text-slate-900">{group.municipality}</p>
              <p className="mt-1">{group.reports.length} mapped reports</p>
              <p className="mt-1 text-xs text-slate-500">Zoom in to view individual report dots.</p>
            </div>
          </Popup>
        </Marker>
      )
    }

    return group.reports.map((report) => (
      <Marker
        key={report.id || `${group.municipality}-${report.position.join(',')}`}
        position={report.position}
        icon={createReportDotIcon()}
        eventHandlers={{ click: () => onSelectReport(report.id) }}
      >
        <Popup>
          <div className="min-w-[190px] text-sm text-slate-700">
            <p className="font-bold text-slate-900">{toDisplayText(report.reference_number, 'Report')}</p>
            <p className="mt-1">{toDisplayText(report.violation_type, 'Untitled report')}</p>
            <p className="mt-1 text-xs text-slate-500">{group.municipality}</p>
            <button
              type="button"
              onClick={() => onSelectReport(report.id)}
              className="mt-3 rounded-full border border-[#cfd8d3] bg-white px-3 py-1.5 text-xs font-black text-[#0f5f46]"
            >
              View details
            </button>
          </div>
        </Popup>
      </Marker>
    ))
  })
}

function OverviewMap({ reports, onSelectReport }) {
  const supportedMunicipalities = useMemo(() => new Set(MUNICIPALITIES.map((municipality) => municipality.name)), [])
  const groupedReports = useMemo(() => {
    const groups = MUNICIPALITIES.map((municipality) => ({
      municipality: municipality.name,
      reports: [],
    }))
    const groupByName = groups.reduce((lookup, group) => {
      lookup[group.municipality] = group
      return lookup
    }, {})

    reports.forEach((report) => {
      const municipality = toDisplayText(report.municipality)
      const position = getReportPosition(report)
      if (!supportedMunicipalities.has(municipality) || !position) return

      groupByName[municipality].reports.push({ ...report, position })
    })

    return groups.filter((group) => group.reports.length > 0)
  }, [reports, supportedMunicipalities])

  return (
    <MapContainer center={DEFAULT_CENTER} zoom={DEFAULT_ZOOM} scrollWheelZoom className="h-[320px] w-full sm:h-[420px]">
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <MapReportMarkers groupedReports={groupedReports} onSelectReport={onSelectReport} />
    </MapContainer>
  )
}

export default function AdminReportMapPanel({ reports, municipalityCounts, loading }) {
  const [selectedReportId, setSelectedReportId] = useState(null)

  const selectedReport = useMemo(() => {
    return reports.find((report) => report.id === selectedReportId) || null
  }, [reports, selectedReportId])

  const highestMunicipality = useMemo(() => {
    return municipalityCounts.reduce((highest, item) => {
      const count = Number(item.count) || 0
      if (!highest || count > highest.count) {
        return { municipality: item.municipality, count }
      }
      return highest
    }, null)
  }, [municipalityCounts])

  const highestAreaReports = useMemo(() => {
    if (!highestMunicipality?.municipality || highestMunicipality.count === 0) return []
    return reports
      .filter((report) => toDisplayText(report.municipality) === highestMunicipality.municipality)
      .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
  }, [highestMunicipality, reports])

  useEffect(() => {
    if (selectedReportId && !reports.some((report) => report.id === selectedReportId)) {
      setSelectedReportId(null)
    }
  }, [reports, selectedReportId])

  return (
    <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
      <div className="overflow-hidden rounded-[1.25rem] border border-[#d6dfd9] bg-white shadow-sm sm:rounded-[1.7rem]">
        <div className="border-b border-[#e5ece8] px-4 py-4 sm:px-6 sm:py-5">
          <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-[#0f5f46]">Interactive Map</p>
          <h3 className="mt-2 text-xl font-black text-[#123629] sm:text-2xl">Reported Areas</h3>
          <p className="mt-2 text-sm text-slate-600">
            Report dots show exact mapped locations, while municipalities with three or more reports cluster until you zoom in.
          </p>
        </div>
        <div className="bg-[#eef3f0]">
          {loading ? (
            <div className="flex h-[320px] items-center justify-center text-sm text-slate-500 sm:h-[420px]">Loading report markers...</div>
          ) : (
            <OverviewMap reports={reports} onSelectReport={setSelectedReportId} />
          )}
        </div>
      </div>

      <div className="rounded-[1.25rem] border border-[#d6dfd9] bg-white p-4 shadow-sm sm:rounded-[1.7rem] sm:p-6">
        <div className="border-b border-[#e5ece8] pb-4">
          <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-[#0f5f46]">
            {selectedReport ? 'Case Details' : 'Highest Reported Area'}
          </p>
          <h3 className="mt-2 break-words text-xl font-black text-[#123629] sm:text-2xl">
            {selectedReport
              ? toDisplayText(selectedReport.reference_number, 'No reference number')
              : highestMunicipality?.count
                ? `${highestMunicipality.municipality} (${highestMunicipality.count})`
                : 'No reported area yet'}
          </h3>
        </div>

        {selectedReport ? (
          <div className="mt-4 space-y-3">
            <button
              type="button"
              onClick={() => setSelectedReportId(null)}
              className="inline-flex min-h-10 items-center rounded-full border border-[#cfd8d3] bg-white px-4 text-sm font-black text-[#1a5e20] shadow-[0_2px_0_#cfd8d3]"
            >
              Clear details
            </button>
            <DetailField label="Submitted By">
              <div className="flex flex-col gap-1">
                <span className="font-black text-[#123629]">{toDisplayText(selectedReport.submitter_name, 'Unknown submitter')}</span>
                <span>{toDisplayText(selectedReport.phone, 'No phone number')}</span>
              </div>
            </DetailField>
            <DetailField label="Municipality">{toDisplayText(selectedReport.municipality, 'Unknown municipality')}</DetailField>
            <DetailField label="Violation Type">{toDisplayText(selectedReport.violation_type, 'Untitled report')}</DetailField>
            <DetailField label="Evidence Photo"><EvidencePreview report={selectedReport} /></DetailField>
            <div className="grid gap-3 sm:grid-cols-2">
              <DetailField label="Latitude">{selectedReport.latitude ?? 'Not available'}</DetailField>
              <DetailField label="Longitude">{selectedReport.longitude ?? 'Not available'}</DetailField>
            </div>
            <DetailField label="Location Source">{toDisplayText(selectedReport.manual_location, 'Coordinate-only report')}</DetailField>
            <DetailField label="Description">{toDisplayText(selectedReport.description, 'Not available')}</DetailField>
            <DetailField label="Timestamp">{formatTimestamp(selectedReport.created_at)}</DetailField>
            <DetailField label="DENR Action Status">{String(selectedReport.status || 'submitted').replaceAll('_', ' ')}</DetailField>
            <DetailField label="DENR Action Description">{toDisplayText(selectedReport.resolution_notes, 'No DENR action recorded yet.')}</DetailField>
            <DetailField label="Acted Date and Time">{selectedReport.resolution_date ? formatTimestamp(selectedReport.resolution_date) : 'Not acted yet'}</DetailField>
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {highestAreaReports.length === 0 ? (
              <div className="rounded-[1.05rem] border border-dashed border-[#ccd7d1] bg-[#f8fbf9] px-4 py-8 text-sm text-slate-500">
                No reports have been submitted yet.
              </div>
            ) : (
              <>
                <div className="rounded-[1.05rem] border border-[#dbe4df] bg-[#f8fbf9] px-4 py-4">
                  <p className="text-sm font-semibold text-slate-700">
                    This area currently has the highest number of reported cases.
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    Click View Details on a case below to show the full information here.
                  </p>
                </div>

                <div className="max-h-[520px] space-y-3 overflow-y-auto pr-1">
                  {highestAreaReports.map((report) => (
                    <article key={report.id} className="rounded-[1.05rem] border border-[#dbe4df] bg-white p-4 shadow-sm">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <p className="break-words text-base font-black text-[#123629]">{toDisplayText(report.reference_number, 'No reference number')}</p>
                          <p className="mt-1 text-sm font-semibold text-slate-700">{toDisplayText(report.violation_type, 'Untitled report')}</p>
                          <p className="mt-1 text-xs font-bold uppercase tracking-[0.12em] text-[#0f5f46]">{formatTimestamp(report.created_at)}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setSelectedReportId(report.id)}
                          className="min-h-10 rounded-full border border-[#003915] bg-[#00441b] px-4 text-sm font-black text-white"
                        >
                          View Details
                        </button>
                      </div>
                      <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                        <div className="rounded-xl border border-[#e5ece8] bg-[#f8fbf9] px-3 py-2">
                          <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">Submitter</p>
                          <p className="mt-1 font-semibold text-slate-700">{toDisplayText(report.submitter_name, 'Unknown submitter')}</p>
                        </div>
                        <div className="rounded-xl border border-[#e5ece8] bg-[#f8fbf9] px-3 py-2">
                          <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">Status</p>
                          <p className="mt-1 font-semibold capitalize text-slate-700">{String(report.status || 'submitted').replaceAll('_', ' ')}</p>
                        </div>
                      </div>
                      <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-600">{toDisplayText(report.description, 'Not available')}</p>
                    </article>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </section>
  )
}
