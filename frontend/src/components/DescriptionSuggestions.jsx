import React, { useEffect, useMemo, useState } from 'react'
import api from '../lib/api'

const DEFAULT_SUGGESTIONS_BY_TYPE = {
  'Illegal Cutting (Section 77)': [
    'Unauthorized cutting of trees was observed in the area. Several trees appear to have been felled without proper DENR permits, causing visible damage to the surrounding environment.',
    'I am reporting suspected illegal logging activity in our barangay. Trees were cut down without authorization, which may violate Section 77 of the forestry code.',
    'Multiple trees were found cut in this location without any visible permit or notice. This activity is affecting the local environment and should be investigated immediately.',
  ],
  'Illegal Occupation (Section 78)': [
    'I am reporting suspected illegal occupation of forest land in this area. Structures and settlement activity were observed within land that appears to be under environmental protection.',
    'Unauthorized use and occupation of land were observed in this location. The activity may violate Section 78 and requires DENR verification.',
    'This report concerns possible illegal settlement or land occupation in a protected or regulated area. The activity should be checked by the proper authorities.',
  ],
  'Chainsaw Act (RA 9175)': [
    'A chainsaw appears to be used or possessed in this area without visible authorization. This may be a violation of the Chainsaw Act and should be investigated.',
    'I observed suspected unlawful chainsaw activity connected to tree cutting in this location. The operation did not appear to have the required permit.',
    'This report concerns possible unauthorized chainsaw use in connection with tree-cutting activity. Immediate field verification is recommended.',
  ],
  'Mining Act (RA 9275)': [
    'Suspected illegal or non-compliant mining activity was observed in this area. The operation appears to be causing environmental disturbance and should be inspected.',
    'I am reporting possible mining-related environmental violations at this location. The activity may be affecting land, water, or nearby vegetation.',
    'Excavation and extraction activity were observed in this area under suspicious conditions. DENR review is requested to determine compliance.',
  ],
  'Wildlife (RA 9147)': [
    'I am reporting a suspected wildlife-related violation in this area. The incident may involve illegal hunting, capture, transport, or possession of protected species.',
    'Possible wildlife poaching or unlawful handling of animals was observed at this location. This may violate RA 9147 and should be investigated.',
    'This report concerns suspected wildlife exploitation activity. Immediate verification is needed due to possible harm to protected species.',
  ],
  Others: [
    'I am reporting an environmental violation that requires DENR assessment. The incident involves activity that may be harmful to protected land, wildlife, or natural resources.',
    'Suspicious environmental activity was observed in this location. The situation should be reviewed to determine whether it violates environmental laws or regulations.',
    'This report concerns a possible environmental offense observed in the area. I am requesting proper inspection and verification by DENR personnel.',
  ],
}

export default function DescriptionSuggestions({ description, setDescription, violationType, location }) {
  const [usedSuggestions, setUsedSuggestions] = useState([])
  const [remoteSuggestions, setRemoteSuggestions] = useState([])
  const [originalRemote, setOriginalRemote] = useState([])
  const [refreshCount, setRefreshCount] = useState(0)
  const [lastPrefilled, setLastPrefilled] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const MAX_REFRESH = 3

  const hasDescription = String(description || '').trim().length > 0

  const fallbackSuggestions = useMemo(
    () => DEFAULT_SUGGESTIONS_BY_TYPE[violationType] || DEFAULT_SUGGESTIONS_BY_TYPE.Others,
    [violationType]
  )

  const availableSuggestions = useMemo(() => {
    const source = remoteSuggestions.length > 0 ? remoteSuggestions : fallbackSuggestions
    return source.filter((suggestion) => !usedSuggestions.includes(suggestion))
  }, [remoteSuggestions, fallbackSuggestions, usedSuggestions])

  const fetchSuggestions = async ({ silent = false, forceFetch = false } = {}) => {
    const wasEmpty = !String(description || '').trim() || (lastPrefilled && description === lastPrefilled)
    setLoading(true)
    if (!silent) {
      setError(null)
    }

    try {
      // If we already have remote suggestions and forceFetch is false,
      // rotate them locally instead of re-calling the API. Allow up to
      // `MAX_REFRESH` cycles, then loop back to the original ordering.
      if (!forceFetch && remoteSuggestions && remoteSuggestions.length > 0) {
        if (refreshCount + 1 >= MAX_REFRESH) {
          // loop back to the original ordering
          setRemoteSuggestions(originalRemote.length ? originalRemote : remoteSuggestions)
          setRefreshCount(0)
        } else {
          const rotated = [...remoteSuggestions.slice(1), remoteSuggestions[0]]
          setRemoteSuggestions(rotated)
          setRefreshCount((c) => c + 1)
        }
        setUsedSuggestions([])
        setLoading(false)
        return
      }

      const res = await api.post('/ai/description-suggestions', {
        violationType,
        location,
        details: description || '',
      })
      // Normalize suggestions: unwrap JSON-encoded strings and extract readable text
      const raw = Array.isArray(res.data?.suggestions) ? res.data.suggestions : []
      // process items individually to avoid a single bad item throwing
      const cleaned = []
      for (const item of raw) {
        try {
          if (typeof item !== 'string') {
            cleaned.push(String(item))
            continue
          }

          const trimmed = item.trim()
          if (!trimmed) continue

          if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
            try {
              const parsed = JSON.parse(trimmed)
              function collectText(obj) {
                if (!obj) return []
                const texts = []
                if (typeof obj === 'string') texts.push(obj)
                if (Array.isArray(obj)) {
                  for (const it of obj) texts.push(...collectText(it))
                } else if (typeof obj === 'object') {
                  if (typeof obj.text === 'string') texts.push(obj.text)
                  for (const k of Object.keys(obj)) {
                    texts.push(...collectText(obj[k]))
                  }
                }
                return texts
              }
              const texts = collectText(parsed)
              if (texts.length) cleaned.push(texts.join('\n\n').trim())
              else cleaned.push(trimmed)
            } catch (e) {
              cleaned.push(trimmed)
            }
          } else {
            cleaned.push(trimmed)
          }
        } catch (e) {
          // ignore individual item errors and continue
          console.error('AI suggestion parse item error', e)
        }
      }

      // Post-process: if violation type is Illegal Cutting, remove any mention of chainsaw
      const sanitized = cleaned.map((s) => {
        if (!s) return ''
        if (violationType === 'Illegal Cutting (Section 77)') {
          // remove the word 'chainsaw' and variants
          let out = s.replace(/\bchainsaws?\b/gi, '')
          out = out.replace(/\s+/g, ' ').trim()
          // remove stray space before punctuation
          out = out.replace(/\s+([.?!,])/g, '$1')
          return out
        }
        return s
      }).filter(Boolean)

      setRemoteSuggestions(sanitized.length ? sanitized : [])
      setOriginalRemote(sanitized.length ? sanitized : [])
      setRefreshCount(0)
      if (wasEmpty && sanitized.length > 0) {
        // prefill first suggestion when description is empty or previous prefill
        setDescription(sanitized[0])
        setUsedSuggestions([sanitized[0]])
        setLastPrefilled(sanitized[0])
      } else {
        setUsedSuggestions([])
        setLastPrefilled(null)
      }
    } catch (err) {
      // If we have fallback suggestions, prefer silently falling back
      if (!silent) {
        if (!fallbackSuggestions || fallbackSuggestions.length === 0) {
          setError(err?.response?.data?.error || 'Unable to load AI suggestions right now')
        } else {
          setError(null)
        }
      }
      if (fallbackSuggestions && fallbackSuggestions.length > 0) {
        setRemoteSuggestions(fallbackSuggestions)
        setOriginalRemote(fallbackSuggestions)
        setRefreshCount(0)
        if (wasEmpty) {
          setDescription(fallbackSuggestions[0])
          setUsedSuggestions([fallbackSuggestions[0]])
          setLastPrefilled(fallbackSuggestions[0])
        } else {
          setUsedSuggestions([])
          setLastPrefilled(null)
        }
      } else {
        setRemoteSuggestions([])
      }
    } finally {
      setLoading(false)
    }
  }

  const rotateLocalSuggestions = () => {
    // If there are no remote suggestions, use the fallback suggestions
    let source = remoteSuggestions && remoteSuggestions.length > 0 ? remoteSuggestions : []
    if (!source || source.length === 0) {
      source = fallbackSuggestions
      // initialize remote/original so subsequent refreshes keep rotating the same set
      setRemoteSuggestions(source)
      setOriginalRemote(source)
      setRefreshCount(0)
      setUsedSuggestions([])
      return
    }

    // Same rotation semantics as fetchSuggestions but without touching loading
    if (refreshCount + 1 >= MAX_REFRESH) {
      setRemoteSuggestions(originalRemote.length ? originalRemote : source)
      setRefreshCount(0)
    } else {
      const rotated = [...source.slice(1), source[0]]
      setRemoteSuggestions(rotated)
      setRefreshCount((c) => c + 1)
    }
    setUsedSuggestions([])
  }

  useEffect(() => {
    if (!violationType) return

    // Reset rotation/state when violation type changes so suggestions
    // always correspond to the selected violation.
    setRemoteSuggestions([])
    setOriginalRemote([])
    setRefreshCount(0)
    setUsedSuggestions([])
    setError(null)

    // Fetch new suggestions for this violation type; silent to avoid
    // showing transient errors to the user. Force fetch to hit API.
    fetchSuggestions({ silent: true, forceFetch: true })
  }, [violationType])

  const handleSuggestionClick = (suggestion) => {
    setDescription(suggestion)
    setUsedSuggestions((current) => [...current, suggestion])
  }

  const handleDescriptionChange = (e) => {
    const newValue = e.target.value
    setDescription(newValue)
    // If user edits the description, consider it user-controlled and
    // clear the prefilled marker so future violation changes won't overwrite it.
    if (newValue === '') {
      setUsedSuggestions([])
      setError(null)
      setLastPrefilled(null)
    } else if (lastPrefilled && newValue !== lastPrefilled) {
      setLastPrefilled(null)
    }
  }

  return (
    <div className="w-full max-w-full space-y-3 overflow-hidden rounded-xl rounded-tr-none border border-[#d7e0da] bg-[#f8f9fa] p-3 sm:space-y-4 sm:p-5">
      {!hasDescription && (
        <>
          <div className="mb-3 flex flex-col gap-3 sm:mb-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl rounded-br-none bg-[#00441b] text-white shadow-sm sm:h-12 sm:w-12">
                <div className="h-4 w-4 rounded-full border-2 border-current border-dashed" />
              </div>
              <div className="min-w-0">
                <h3 className="text-base font-black leading-tight text-[#212529]">Suggested Descriptions</h3>
                <p className="mt-1 text-sm leading-5 text-[#495057]">
                  Suggestions refresh automatically when you change the violation type.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => (remoteSuggestions && remoteSuggestions.length > 0 ? rotateLocalSuggestions() : fetchSuggestions())}
              disabled={loading && (!remoteSuggestions || remoteSuggestions.length === 0)}
              className="min-h-11 w-full shrink-0 rounded-full border border-[#003915] bg-[#00441b] px-4 text-sm font-black text-white shadow-[0_3px_0_#003915] transition active:translate-y-[2px] active:shadow-[0_1px_0_#003915] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
            >
              {loading && (!remoteSuggestions || remoteSuggestions.length === 0) ? 'Generating...' : 'Refresh'}
            </button>
          </div>

          {error && <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

          {remoteSuggestions.length === 0 && !loading && (
            <p className="text-xs text-gray-600">
            </p>
          )}

          {availableSuggestions.length > 0 && (
            <div className="space-y-3">
              {availableSuggestions.map((suggestion, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSuggestionClick(suggestion)}
                  className="group w-full max-w-full rounded-xl rounded-tr-none border border-[#cfd8d3] bg-white p-3 text-left shadow-[0_3px_0_#d7e0da] transition hover:bg-[#eef6ea] active:translate-y-[1px] active:shadow-[0_1px_0_#d7e0da] sm:p-4"
                >
                  <div className="flex min-w-0 items-start gap-3">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#eef6ea] text-sm font-black text-[#1a5e20] transition group-hover:bg-[#dcefd6]">
                      {idx + 1}
                    </div>
                    <p className="min-w-0 flex-1 whitespace-normal break-words text-sm leading-6 text-[#495057] group-hover:text-[#212529]">
                      {suggestion}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}

          {usedSuggestions.length > 0 && (
            <p className="flex items-start gap-2 text-sm leading-5 text-[#1a5e20]">
              <span className="inline-block h-2 w-2 rounded-full bg-current" />
              <span>You can edit any suggestion after selecting it.</span>
            </p>
          )}
        </>
      )}

      <div className="mt-3 border-t border-[#d7e0da] pt-3 sm:mt-4 sm:pt-4">
        <label className="mb-2 block text-sm font-black text-[#212529] sm:mb-3">
          Description <span className="text-red-500">*</span>
        </label>
        <textarea
          value={description || ''}
          onChange={handleDescriptionChange}
          placeholder="Select an AI suggestion above or provide detailed information about the environmental violation."
          rows={6}
          className="min-h-40 w-full max-w-full resize-y rounded-xl rounded-tr-none border border-[#cfd8d3] bg-white px-3 py-3 text-base leading-6 text-[#212529] shadow-[inset_0_2px_6px_rgba(0,68,27,0.08)] outline-none transition placeholder:text-[#6c757d] focus:border-[#1a5e20] focus:ring-2 focus:ring-[#4c9a2a]/25 sm:px-4"
        />
        <p className="mt-2 flex items-start gap-2 text-xs leading-5 text-[#6c757d]">
          <span className="mt-1 inline-block h-2 w-2 rounded-full bg-current" />
          <span>Be as specific as possible. Include when, where, and what you observed.</span>
        </p>
      </div>
    </div>
  )
}
