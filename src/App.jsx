import { useState, useEffect, useRef } from 'react';
import {
  Plus, X, Sparkles, Tag as TagIcon, AlertTriangle, Check, Copy,
  Loader2, BookOpen, Trash2, ArrowRight, FileText, Pencil, Upload,
  LayoutTemplate, Download, ChevronDown, MessageCircle, Lightbulb
} from 'lucide-react';

const COMPETENCIES = [
  { id: 'leadership', label: 'Leadership', color: '#C79A3D' },
  { id: 'conflict', label: 'Conflict', color: '#B4694A' },
  { id: 'failure', label: 'Failure & Learning', color: '#8B93A0' },
  { id: 'impact', label: 'Impact', color: '#4C8577' },
  { id: 'technical', label: 'Technical', color: '#5B7FA6' },
  { id: 'collaboration', label: 'Collaboration', color: '#8C6FA0' },
  { id: 'initiative', label: 'Initiative', color: '#C79A3D' },
];

const VAGUE_PHRASES = [
  'responsible for', 'helped with', 'worked on', 'assisted with',
  'involved in', 'participated in', 'in charge of', 'duties included', 'worked closely'
];

const STORY_PROMPTS = [
  { q: 'A class project you ended up leading or holding together', tag: 'Class project' },
  { q: 'Something at a part-time job or internship you noticed was broken and fixed or improved', tag: 'Work / internship' },
  { q: 'A group project where someone flaked, disagreed with you, or the plan fell apart', tag: 'Group conflict' },
  { q: 'A club, team, or org where you took on more than you were asked to', tag: 'Campus leadership' },
  { q: 'A time you had to learn a tool, skill, or subject fast with no real guidance', tag: 'Fast learning' },
  { q: 'A time something you tried failed, and what you did right after', tag: 'Failure / learning' },
  { q: 'Something you organized — an event, a schedule, a fundraiser, a move-in', tag: 'Organizing' },
];

const TEMPLATES = [
  {
    id: 'first-resume',
    name: 'First Resume',
    subtitle: 'No work experience yet — leads with education and projects',
    sections: [
      { key: 'education', label: 'Education', type: 'education' },
      { key: 'projects', label: 'Projects', type: 'stories', match: ['technical', 'impact', 'initiative'] },
      { key: 'experience', label: 'Experience & Activities', type: 'stories', match: ['leadership', 'collaboration', 'conflict', 'failure'] },
      { key: 'skills', label: 'Skills', type: 'skills' },
    ],
  },
  {
    id: 'skills-forward',
    name: 'Skills-Forward',
    subtitle: 'Good for technical roles — leads with skills, then projects',
    sections: [
      { key: 'skills', label: 'Skills', type: 'skills' },
      { key: 'education', label: 'Education', type: 'education' },
      { key: 'projects', label: 'Projects', type: 'stories', match: ['technical', 'impact'] },
      { key: 'experience', label: 'Experience', type: 'stories', match: ['leadership', 'collaboration', 'conflict', 'failure', 'initiative'] },
    ],
  },
  {
    id: 'leadership-forward',
    name: 'Leadership & Activities',
    subtitle: 'Good when campus involvement is your strongest material',
    sections: [
      { key: 'education', label: 'Education', type: 'education' },
      { key: 'leadership', label: 'Leadership & Activities', type: 'stories', match: ['leadership', 'initiative', 'collaboration'] },
      { key: 'experience', label: 'Work Experience', type: 'stories', match: ['technical', 'impact', 'conflict', 'failure'] },
      { key: 'skills', label: 'Skills', type: 'skills' },
    ],
  },
];

function isVague(text) {
  const lower = (text || '').toLowerCase();
  const hasVaguePhrase = VAGUE_PHRASES.some((p) => lower.includes(p));
  const hasNumber = /\d/.test(text || '');
  return hasVaguePhrase && !hasNumber;
}

function competencyMeta(id) {
  return COMPETENCIES.find((c) => c.id === id) || COMPETENCIES[3];
}

const QUESTION_KEYWORD_MAP = [
  { keywords: ['conflict', 'disagree', 'difficult person', 'tension', 'coworker who'], comp: 'conflict' },
  { keywords: ['lead a team', 'leadership', 'led a', 'delegate'], comp: 'leadership' },
  { keywords: ['fail', 'failure', 'mistake', 'went wrong', 'setback'], comp: 'failure' },
  { keywords: ['team', 'collaborat', 'group project', 'worked with others'], comp: 'collaboration' },
  { keywords: ['proud', 'accomplish', 'impact', 'result', 'achievement'], comp: 'impact' },
  { keywords: ['technical', 'tool', 'software', 'data', 'code', 'model'], comp: 'technical' },
  { keywords: ['initiative', 'went above', 'extra mile', 'proactive', 'own idea'], comp: 'initiative' },
];

function suggestStoriesForQuestion(question, stories) {
  const lower = (question || '').toLowerCase();
  const match = QUESTION_KEYWORD_MAP.find((m) => m.keywords.some((k) => lower.includes(k)));
  if (!match) return stories.slice(0, 2);
  const filtered = stories.filter((s) => s.competency === match.comp);
  return filtered.length ? filtered : stories.slice(0, 2);
}

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

const FONTS = `
@import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,500;0,9..144,600;1,9..144,500&family=Inter:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap');

@media print {
  @page { margin: 0.5in; }
  body:not(.printing-resume) { display: none; }
  body.printing-resume * { visibility: hidden; }
  body.printing-resume #resume-print-target,
  body.printing-resume #resume-print-target * { visibility: visible; }
  body.printing-resume #resume-print-target {
    position: absolute; left: 0; top: 0; width: 100%;
    box-shadow: none !important; border-radius: 0 !important;
  }
}
`;

export default function CareerMode() {
  const [tab, setTab] = useState('bank');
  const [stories, setStories] = useState([]);
  const [ready, setReady] = useState(false);
  const [storageError, setStorageError] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await window.storage.get('stories');
        if (res && res.value) setStories(JSON.parse(res.value));
      } catch (e) {
        // no stories yet, fine
      }
      setReady(true);
    })();
  }, []);

  async function persistStories(next) {
    setStories(next);
    try {
      const result = await window.storage.set('stories', JSON.stringify(next));
      if (!result) setStorageError(true);
    } catch (e) {
      setStorageError(true);
    }
  }

  return (
    <div style={{
      fontFamily: "'Inter', sans-serif",
      background: '#12151C',
      color: '#E9E5D8',
      minHeight: '600px',
      width: '100%',
      borderRadius: '12px',
      overflow: 'hidden',
    }}>
      <style>{FONTS}</style>
      <Header tab={tab} setTab={setTab} storyCount={stories.length} />
      {!ready ? (
        <div style={{ padding: '64px 24px', textAlign: 'center', color: '#8B93A0' }}>
          <Loader2 size={20} className="animate-spin" style={{ margin: '0 auto 12px' }} />
          Loading your story bank…
        </div>
      ) : tab === 'bank' ? (
        <StoryBank stories={stories} onChange={persistStories} goToBuilder={() => setTab('builder')} />
      ) : tab === 'import' ? (
        <ImportResume stories={stories} onChange={persistStories} goToBank={() => setTab('bank')} />
      ) : tab === 'templates' ? (
        <ResumeTemplates stories={stories} goToBank={() => setTab('bank')} />
      ) : tab === 'interview' ? (
        <InterviewPrep stories={stories} />
      ) : (
        <ResumeBuilder stories={stories} />
      )}
      {storageError && (
        <div style={{ padding: '8px 24px', fontSize: '12px', color: '#B4694A', borderTop: '1px solid #262E3B' }}>
          Couldn't save changes just now — they may not persist.
        </div>
      )}
    </div>
  );
}

function Header({ tab, setTab, storyCount }) {
  return (
    <div style={{
      padding: '28px 28px 0 28px',
      borderBottom: '1px solid #262E3B',
    }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{
            fontFamily: "'Fraunces', serif",
            fontStyle: 'italic',
            fontWeight: 500,
            fontSize: '26px',
            letterSpacing: '-0.01em',
          }}>
            CareerMode
          </div>
          <div style={{ fontSize: '12.5px', color: '#8B93A0', marginTop: '2px', fontFamily: "'IBM Plex Mono', monospace" }}>
            everything you need to find and land the career you want
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: '4px', marginTop: '20px' }}>
        <TabButton active={tab === 'bank'} onClick={() => setTab('bank')} icon={<BookOpen size={14} />}>
          Story Bank {storyCount > 0 && <span style={{ opacity: 0.6 }}>({storyCount})</span>}
        </TabButton>
        <TabButton active={tab === 'import'} onClick={() => setTab('import')} icon={<Upload size={14} />}>
          Import Resume
        </TabButton>
        <TabButton active={tab === 'templates'} onClick={() => setTab('templates')} icon={<LayoutTemplate size={14} />}>
          Templates
        </TabButton>
        <TabButton active={tab === 'builder'} onClick={() => setTab('builder')} icon={<FileText size={14} />}>
          Resume Builder
        </TabButton>
        <TabButton active={tab === 'interview'} onClick={() => setTab('interview')} icon={<MessageCircle size={14} />}>
          Interview Prep
        </TabButton>
      </div>
    </div>
  );
}

function TabButton({ active, onClick, children, icon }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: '6px',
        padding: '9px 16px',
        fontSize: '13.5px',
        fontWeight: 500,
        background: 'transparent',
        color: active ? '#E9E5D8' : '#8B93A0',
        border: 'none',
        borderBottom: active ? '2px solid #C79A3D' : '2px solid transparent',
        cursor: 'pointer',
        marginBottom: '-1px',
      }}
    >
      {icon}{children}
    </button>
  );
}

/* ---------------- Story Bank ---------------- */

function StoryBank({ stories, onChange, goToBuilder }) {
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [promptSeed, setPromptSeed] = useState(null);

  function upsertStory(story) {
    if (editingId) {
      onChange(stories.map((s) => (s.id === editingId ? story : s)));
    } else {
      onChange([story, ...stories]);
    }
    setFormOpen(false);
    setEditingId(null);
    setPromptSeed(null);
  }

  function startFromPrompt(prompt) {
    setEditingId(null);
    setPromptSeed(prompt);
    setFormOpen(true);
  }

  function deleteStory(id) {
    onChange(stories.filter((s) => s.id !== id));
  }

  const editingStory = editingId ? stories.find((s) => s.id === editingId) : null;

  return (
    <div style={{ padding: '24px 28px 32px' }}>
      {!formOpen ? (
        <button
          onClick={() => { setEditingId(null); setPromptSeed(null); setFormOpen(true); }}
          style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            background: '#C79A3D', color: '#12151C', fontWeight: 600,
            border: 'none', borderRadius: '8px', padding: '10px 16px',
            fontSize: '13.5px', cursor: 'pointer', marginBottom: '20px',
          }}
        >
          <Plus size={16} /> Add a story
        </button>
      ) : (
        <StoryForm
          key={editingId || promptSeed?.q || 'new'}
          initial={editingStory}
          promptSeed={promptSeed}
          onCancel={() => { setFormOpen(false); setEditingId(null); setPromptSeed(null); }}
          onSave={upsertStory}
        />
      )}

      {!formOpen && <PromptFinder onPick={startFromPrompt} />}

      {stories.length === 0 && !formOpen && (
        <EmptyState />
      )}

      {stories.length > 0 && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '14px', marginTop: formOpen ? '20px' : 0 }}>
            {stories.map((s) => (
              <StoryCard
                key={s.id}
                story={s}
                onEdit={() => { setEditingId(s.id); setFormOpen(true); }}
                onDelete={() => deleteStory(s.id)}
              />
            ))}
          </div>
          {stories.length >= 3 && (
            <button
              onClick={goToBuilder}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                background: 'transparent', color: '#4C8577', fontWeight: 600,
                border: '1px solid #4C8577', borderRadius: '8px', padding: '10px 16px',
                fontSize: '13px', cursor: 'pointer', marginTop: '24px',
              }}
            >
              Match these against a job posting <ArrowRight size={14} />
            </button>
          )}
        </>
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div style={{
      border: '1px dashed #262E3B', borderRadius: '10px',
      padding: '32px 24px', textAlign: 'center', color: '#8B93A0', fontSize: '13.5px',
    }}>
      Your story bank is empty — and that's normal this early. You don't need internships
      at big-name companies. A class project, a part-time job, or a club you ran things for
      counts. Try one of the prompts below to get started.
    </div>
  );
}

function PromptFinder({ onPick }) {
  const [open, setOpen] = useState(true);
  return (
    <div style={{ marginBottom: '20px' }}>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          background: 'none', border: 'none', color: '#4C8577', fontSize: '12.5px',
          fontWeight: 600, cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: '5px',
        }}
      >
        {open ? 'Hide' : 'Not sure what counts as a story?'} <ArrowRight size={12} style={{ transform: open ? 'rotate(90deg)' : 'none' }} />
      </button>
      {open && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '8px', marginTop: '10px' }}>
          {STORY_PROMPTS.map((p) => (
            <button
              key={p.q}
              onClick={() => onPick(p)}
              style={{
                textAlign: 'left', background: '#1B212C', border: '1px solid #262E3B',
                borderRadius: '8px', padding: '11px 13px', color: '#E9E5D8', cursor: 'pointer', fontSize: '12.5px', lineHeight: 1.4,
              }}
            >
              <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px', color: '#C79A3D', display: 'block', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {p.tag}
              </span>
              {p.q}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function StoryForm({ initial, promptSeed, onSave, onCancel }) {
  const [title, setTitle] = useState(initial?.title || '');
  const [description, setDescription] = useState(initial?.description || '');
  const [competency, setCompetency] = useState(initial?.competency || 'impact');
  const [tags, setTags] = useState(initial?.tags?.join(', ') || (promptSeed?.tag || ''));
  const vague = isVague(description);

  function handleSave() {
    if (!title.trim() || !description.trim()) return;
    onSave({
      id: initial?.id || uid(),
      title: title.trim(),
      description: description.trim(),
      competency,
      tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
    });
  }

  return (
    <div style={{ background: '#1B212C', border: '1px solid #262E3B', borderRadius: '10px', padding: '18px', marginBottom: '8px' }}>
      {promptSeed && (
        <div style={{ fontSize: '12.5px', color: '#4C8577', marginBottom: '10px', fontStyle: 'italic' }}>
          Prompt: {promptSeed.q}
        </div>
      )}
      <input
        placeholder="Story title — e.g. 'Ran the budget for spring formal'"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        style={inputStyle}
      />
      <textarea
        placeholder="What was the situation, what did you actually do, and what changed because of it? A number, a group size, or a named result — even a small one — is more useful than 'helped out.'"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        rows={4}
        style={{ ...inputStyle, marginTop: '10px', resize: 'vertical', fontFamily: "'Inter', sans-serif" }}
      />
      {vague && description.trim() && (
        <div style={{ display: 'flex', gap: '6px', alignItems: 'flex-start', marginTop: '8px', fontSize: '12.5px', color: '#C79A3D' }}>
          <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: '1px' }} />
          This reads a little vague — consider naming a number, a team size, or a concrete result. You can still save it as is.
        </div>
      )}
      <div style={{ display: 'flex', gap: '10px', marginTop: '10px', flexWrap: 'wrap' }}>
        <select value={competency} onChange={(e) => setCompetency(e.target.value)} style={{ ...inputStyle, flex: '0 0 auto', width: 'auto' }}>
          {COMPETENCIES.map((c) => (
            <option key={c.id} value={c.id}>{c.label}</option>
          ))}
        </select>
        <input
          placeholder="tags, comma separated — e.g. python, mentoring"
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          style={{ ...inputStyle, flex: 1, minWidth: '200px' }}
        />
      </div>
      <div style={{ display: 'flex', gap: '8px', marginTop: '14px' }}>
        <button onClick={handleSave} style={primaryBtn}>
          <Check size={14} /> Save story
        </button>
        <button onClick={onCancel} style={secondaryBtn}>Cancel</button>
      </div>
    </div>
  );
}

function StoryCard({ story, onEdit, onDelete }) {
  const meta = competencyMeta(story.competency);
  const vague = isVague(story.description);
  return (
    <div style={{
      background: '#EEE7D6', color: '#22201A',
      borderRadius: '3px', padding: '16px 16px 14px',
      position: 'relative', borderLeft: `5px solid ${meta.color}`,
      boxShadow: '0 1px 0 rgba(0,0,0,0.2), 0 6px 14px rgba(0,0,0,0.25)',
    }}>
      <div style={{
        position: 'absolute', top: '12px', right: '12px',
        transform: 'rotate(-6deg)',
        fontFamily: "'IBM Plex Mono', monospace",
        fontSize: '9.5px', letterSpacing: '0.08em', textTransform: 'uppercase',
        border: `1.5px solid ${meta.color}`, color: meta.color,
        padding: '2px 6px', borderRadius: '3px', fontWeight: 500,
        opacity: 0.85,
      }}>
        {meta.label}
      </div>
      <div style={{ fontFamily: "'Fraunces', serif", fontWeight: 600, fontSize: '16px', paddingRight: '70px', lineHeight: 1.25 }}>
        {story.title}
      </div>
      <div style={{ fontSize: '13px', marginTop: '8px', lineHeight: 1.5, color: '#3A362C', minHeight: '40px' }}>
        {story.description.length > 140 ? story.description.slice(0, 140) + '…' : story.description}
      </div>
      {vague && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#B4694A', marginTop: '8px' }}>
          <AlertTriangle size={11} /> no concrete outcome yet
        </div>
      )}
      {story.tags?.length > 0 && (
        <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', marginTop: '10px' }}>
          {story.tags.map((t) => (
            <span key={t} style={{
              fontFamily: "'IBM Plex Mono', monospace", fontSize: '10.5px',
              background: 'rgba(0,0,0,0.06)', padding: '2px 7px', borderRadius: '3px', color: '#5A5540',
            }}>{t}</span>
          ))}
        </div>
      )}
      <div style={{ display: 'flex', gap: '10px', marginTop: '12px', paddingTop: '10px', borderTop: '1px solid rgba(0,0,0,0.08)' }}>
        <button onClick={onEdit} style={cardActionBtn}><Pencil size={12} /> Edit</button>
        <button onClick={onDelete} style={{ ...cardActionBtn, color: '#B4694A' }}><Trash2 size={12} /> Delete</button>
      </div>
    </div>
  );
}

/* ---------------- Import Resume ---------------- */

function ImportResume({ stories, onChange, goToBank }) {
  const [resumeText, setResumeText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [extracted, setExtracted] = useState(null);
  const [included, setIncluded] = useState({});
  const [added, setAdded] = useState(false);
  const fileRef = useRef(null);

  function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.txt')) {
      setError('Only .txt files can be read directly here — for a Word or PDF resume, open it and paste the text into the box instead.');
      return;
    }
    setError(null);
    const reader = new FileReader();
    reader.onload = (evt) => setResumeText(evt.target.result || '');
    reader.readAsText(file);
  }

  async function runExtract() {
    if (!resumeText.trim()) return;
    setLoading(true);
    setError(null);
    setExtracted(null);
    setAdded(false);
    try {
      const prompt = `You are helping a college student or recent grad turn their existing resume into a reusable "story bank" for future job applications and interviews.

RESUME TEXT:
"""${resumeText.trim().slice(0, 8000)}"""

For each distinct experience entry in the resume — a job, internship, class project, student org role, volunteer position, or notable bullet point — produce one story with:
- "title": a short label for the experience
- "description": 2-3 full sentences covering the situation, what the student actually did, and the result. Preserve any numbers, scope, or named outcomes already in the resume text. Do not invent details that aren't stated or clearly implied.
- "competency": the closest fit from this exact list: leadership, conflict, failure, impact, technical, collaboration, initiative
- "tags": 2-4 short tags (skills, tools, or context)

Skip pure contact info, section headers, and skills lists with no narrative content. Extract at most 12 stories, most substantial first.

Return ONLY a JSON object, no markdown fences, no commentary, in this exact shape:
{"stories":[{"title":"...","description":"...","competency":"...","tags":["..."]}]}`;

      const response = await fetch('/api/claude', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6',
          max_tokens: 1000,
          messages: [{ role: 'user', content: prompt }],
        }),
      });
      const data = await response.json();
      const text = (data.content || []).map((b) => b.text || '').join('\n');
      const clean = text.replace(/```json|```/g, '').trim();
      const parsed = JSON.parse(clean);
      const withIds = (parsed.stories || []).map((s) => ({ ...s, id: uid() }));
      setExtracted(withIds);
      const init = {};
      withIds.forEach((s) => { init[s.id] = true; });
      setIncluded(init);
    } catch (e) {
      setError('Something went wrong reading that resume — try again, or paste a shorter section.');
    } finally {
      setLoading(false);
    }
  }

  function toggleIncluded(id) {
    setIncluded((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  function addSelected() {
    const toAdd = extracted
      .filter((s) => included[s.id])
      .map((s) => ({
        id: s.id,
        title: s.title,
        description: s.description,
        competency: COMPETENCIES.some((c) => c.id === s.competency) ? s.competency : 'impact',
        tags: Array.isArray(s.tags) ? s.tags : [],
      }));
    if (toAdd.length === 0) return;
    onChange([...toAdd, ...stories]);
    setAdded(true);
  }

  const selectedCount = extracted ? extracted.filter((s) => included[s.id]).length : 0;

  return (
    <div style={{ padding: '24px 28px 32px' }}>
      <div style={{ fontSize: '13px', color: '#8B93A0', marginBottom: '14px', lineHeight: 1.5, maxWidth: '540px' }}>
        Already have a resume from a career center draft, a template, or last semester? Paste it in
        and this will pull out each job, project, or club into its own story — a faster start than
        typing everything from scratch.
      </div>

      <textarea
        placeholder="Paste your full resume text here…"
        value={resumeText}
        onChange={(e) => setResumeText(e.target.value)}
        rows={9}
        style={{ ...inputStyle, fontFamily: "'Inter', sans-serif", resize: 'vertical' }}
      />

      <div style={{ display: 'flex', gap: '10px', marginTop: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
        <button
          onClick={runExtract}
          disabled={loading || !resumeText.trim()}
          style={{
            ...primaryBtn,
            opacity: loading || !resumeText.trim() ? 0.5 : 1,
            cursor: loading || !resumeText.trim() ? 'default' : 'pointer',
          }}
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
          {loading ? 'Reading your resume…' : 'Extract stories'}
        </button>
        <button onClick={() => fileRef.current?.click()} style={secondaryBtn}>
          <FileText size={14} /> Upload .txt file
        </button>
        <input ref={fileRef} type="file" accept=".txt" onChange={handleFile} style={{ display: 'none' }} />
      </div>

      {error && <div style={{ color: '#B4694A', fontSize: '13px', marginTop: '12px' }}>{error}</div>}

      {extracted && extracted.length === 0 && !loading && (
        <div style={{ marginTop: '20px', color: '#8B93A0', fontSize: '13.5px' }}>
          Couldn't find distinct experiences to pull out of that text — try pasting the full
          experience section rather than a summary.
        </div>
      )}

      {extracted && extracted.length > 0 && (
        <div style={{ marginTop: '22px' }}>
          <div style={{ fontSize: '12px', color: '#8B93A0', marginBottom: '12px', fontFamily: "'IBM Plex Mono', monospace" }}>
            found {extracted.length} {extracted.length === 1 ? 'story' : 'stories'} — uncheck any you don't want, then add them to your bank
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '10px' }}>
            {extracted.map((s) => (
              <ExtractedCard key={s.id} story={s} checked={!!included[s.id]} onToggle={() => toggleIncluded(s.id)} />
            ))}
          </div>

          {!added ? (
            <button
              onClick={addSelected}
              disabled={selectedCount === 0}
              style={{
                ...primaryBtn, marginTop: '18px',
                opacity: selectedCount === 0 ? 0.5 : 1,
                cursor: selectedCount === 0 ? 'default' : 'pointer',
              }}
            >
              <Plus size={14} /> Add {selectedCount} {selectedCount === 1 ? 'story' : 'stories'} to Story Bank
            </button>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#4C8577', fontSize: '13px' }}>
                <Check size={15} /> Added to your Story Bank
              </div>
              <button onClick={goToBank} style={secondaryBtn}>
                Review in Story Bank <ArrowRight size={13} />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ExtractedCard({ story, checked, onToggle }) {
  const meta = competencyMeta(story.competency);
  const vague = isVague(story.description);
  return (
    <div style={{
      background: '#1B212C', border: '1px solid #262E3B', borderRadius: '8px', padding: '13px',
      opacity: checked ? 1 : 0.5, borderLeft: `4px solid ${meta.color}`,
    }}>
      <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
        <input type="checkbox" checked={checked} onChange={onToggle} style={{ marginTop: '3px', accentColor: '#4C8577', width: '15px', height: '15px', flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', alignItems: 'baseline' }}>
            <div style={{ fontFamily: "'Fraunces', serif", fontWeight: 600, fontSize: '14px' }}>{story.title}</div>
          </div>
          <div style={{ fontSize: '11px', color: meta.color, fontFamily: "'IBM Plex Mono', monospace", marginTop: '2px' }}>{meta.label}</div>
          <div style={{ fontSize: '12.5px', color: '#B8B3A4', marginTop: '6px', lineHeight: 1.45 }}>{story.description}</div>
          {vague && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10.5px', color: '#C79A3D', marginTop: '6px' }}>
              <AlertTriangle size={10} /> could use a concrete outcome
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------------- Resume Templates ---------------- */

const EXAMPLE_BULLETS_EXPERIENCE = [
  'Built a monthly cash flow forecasting model for a $12M portfolio of client accounts, reducing forecast variance by 8%',
  'Analyzed quarterly financial statements for 15+ client companies to identify cost-saving opportunities totaling $40K',
  'Assisted in preparing a valuation report for a potential acquisition and presented key findings to a team of 6 senior analysts',
  'Automated a recurring expense-tracking spreadsheet using Excel formulas, cutting weekly reporting time by 30%',
];

const EXAMPLE_BULLETS_LEADERSHIP = [
  'Served as chapter treasurer, managing a $2,000 annual budget for events, speaker sponsorships, and member resources',
  'Organized a resume workshop for 25+ students, coordinating with the career center to bring in three alumni panelists',
  'Led weekly meetings for a chapter of 40+ members, planning agendas and coordinating guest speakers each semester',
];

const BLANK_PROFILE = {
  name: '', email: '', phone: '', location: '',
  school: '', degree: '', gradDate: '', gpa: '', coursework: '',
};

function ResumeTemplates({ stories, goToBank }) {
  const [profile, setProfile] = useState(BLANK_PROFILE);
  const [loaded, setLoaded] = useState(false);
  const [templateId, setTemplateId] = useState(null);
  const [assignment, setAssignment] = useState({});
  const [skillsText, setSkillsText] = useState('');
  const [expanded, setExpanded] = useState({});
  const [copied, setCopied] = useState(false);
  const [showExample, setShowExample] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await window.storage.get('profile');
        if (res && res.value) setProfile({ ...BLANK_PROFILE, ...JSON.parse(res.value) });
      } catch (e) { /* no profile yet */ }
      setLoaded(true);
    })();
  }, []);

  async function updateProfile(field, value) {
    const next = { ...profile, [field]: value };
    setProfile(next);
    try { await window.storage.set('profile', JSON.stringify(next)); } catch (e) { /* best effort */ }
  }

  const template = TEMPLATES.find((t) => t.id === templateId);

  function selectTemplate(t) {
    setTemplateId(t.id);
    const nextAssignment = {};
    stories.forEach((s) => {
      const section = t.sections.find((sec) => sec.type === 'stories' && sec.match.includes(s.competency));
      if (section) nextAssignment[s.id] = section.key;
    });
    setAssignment(nextAssignment);
    const allTags = Array.from(new Set(stories.flatMap((s) => s.tags || [])));
    setSkillsText(allTags.join(', '));
    setExpanded({});
    setCopied(false);
  }

  function reassign(storyId, sectionKey, checked) {
    setAssignment((prev) => ({ ...prev, [storyId]: checked ? sectionKey : null }));
  }

  function plainText() {
    if (!template) return '';
    const lines = [];
    lines.push((profile.name || 'Your Name').toUpperCase());
    const contactLine = [profile.email, profile.phone, profile.location].filter(Boolean).join('  •  ');
    if (contactLine) lines.push(contactLine);
    lines.push('');
    template.sections.forEach((sec) => {
      lines.push(sec.label.toUpperCase());
      if (sec.type === 'education') {
        const line1 = [profile.school, profile.degree].filter(Boolean).join(' — ');
        if (line1) lines.push(line1);
        const line2 = [profile.gradDate, profile.gpa ? `GPA ${profile.gpa}` : ''].filter(Boolean).join('  •  ');
        if (line2) lines.push(line2);
        if (profile.coursework) lines.push(`Relevant coursework: ${profile.coursework}`);
      } else if (sec.type === 'skills') {
        lines.push(skillsText || '—');
      } else {
        const assigned = stories.filter((s) => assignment[s.id] === sec.key);
        if (assigned.length === 0) lines.push('(no stories assigned yet)');
        assigned.forEach((s) => lines.push(`• ${s.description}`));
      }
      lines.push('');
    });
    return lines.join('\n').trim();
  }

  async function copyText() {
    try {
      await navigator.clipboard.writeText(plainText());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) { /* clipboard unavailable */ }
  }

  function downloadText() {
    const blob = new Blob([plainText()], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(profile.name || 'resume').replace(/\s+/g, '_')}_resume.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function downloadPDF() {
    document.body.classList.add('printing-resume');
    window.onafterprint = () => {
      document.body.classList.remove('printing-resume');
      window.onafterprint = null;
    };
    window.print();
  }

  if (!loaded) return null;

  if (stories.length === 0) {
    return (
      <div style={{ padding: '48px 28px', textAlign: 'center', color: '#8B93A0', fontSize: '13.5px' }}>
        Templates pull from your Story Bank, so add a few stories first — or import an existing
        resume — before building one here.
      </div>
    );
  }

  return (
    <div style={{ padding: '24px 28px 40px' }}>
      <div style={{ fontSize: '13px', color: '#8B93A0', marginBottom: '14px', lineHeight: 1.5, maxWidth: '560px' }}>
        No resume yet? Pick a structure below and it'll pull straight from your Story Bank.
        Unlike Resume Builder, this doesn't tailor to one job posting — it's a solid general
        draft you can adjust before applying anywhere.
      </div>

      <button
        onClick={() => setShowExample((s) => !s)}
        style={{
          background: 'none', border: 'none', color: '#4C8577', fontSize: '16px',
          fontWeight: 700, cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '20px',
        }}
      >
        {showExample ? 'Hide filled-in example' : 'See a filled-in example first'}
        <ChevronDown size={16} style={{ transform: showExample ? 'rotate(180deg)' : 'none' }} />
      </button>

      {showExample && <ExampleResumePanel />}

      {!template ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '12px' }}>
          {TEMPLATES.map((t) => (
            <button
              key={t.id}
              onClick={() => selectTemplate(t)}
              style={{
                textAlign: 'left', background: '#1B212C', border: '1px solid #262E3B',
                borderRadius: '10px', padding: '16px', cursor: 'pointer', color: '#E9E5D8',
              }}
            >
              <div style={{ fontFamily: "'Fraunces', serif", fontWeight: 600, fontSize: '15px', marginBottom: '6px' }}>{t.name}</div>
              <div style={{ fontSize: '12px', color: '#8B93A0', lineHeight: 1.4, marginBottom: '10px' }}>{t.subtitle}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                {t.sections.map((s, i) => (
                  <div key={s.key} style={{ fontSize: '10.5px', fontFamily: "'IBM Plex Mono', monospace", color: '#5A7A6E' }}>
                    {i + 1}. {s.label}
                  </div>
                ))}
              </div>
            </button>
          ))}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 1fr) minmax(280px, 1.1fr)', gap: '22px', alignItems: 'start' }}>
          <div>
            <button onClick={() => setTemplateId(null)} style={{ ...secondaryBtn, marginBottom: '16px', fontSize: '12px', padding: '6px 12px' }}>
              ← Choose a different template
            </button>

            <SectionLabel>Contact & education</SectionLabel>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '10px' }}>
              <input placeholder="Full name" value={profile.name} onChange={(e) => updateProfile('name', e.target.value)} style={inputStyle} />
              <input placeholder="Location" value={profile.location} onChange={(e) => updateProfile('location', e.target.value)} style={inputStyle} />
              <input placeholder="Email" value={profile.email} onChange={(e) => updateProfile('email', e.target.value)} style={inputStyle} />
              <input placeholder="Phone" value={profile.phone} onChange={(e) => updateProfile('phone', e.target.value)} style={inputStyle} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
              <input placeholder="School" value={profile.school} onChange={(e) => updateProfile('school', e.target.value)} style={inputStyle} />
              <input placeholder="Degree — e.g. B.S. Computer Science" value={profile.degree} onChange={(e) => updateProfile('degree', e.target.value)} style={inputStyle} />
              <input placeholder="Expected grad — e.g. May 2027" value={profile.gradDate} onChange={(e) => updateProfile('gradDate', e.target.value)} style={inputStyle} />
              <input placeholder="GPA (optional)" value={profile.gpa} onChange={(e) => updateProfile('gpa', e.target.value)} style={inputStyle} />
            </div>
            <input placeholder="Relevant coursework (optional)" value={profile.coursework} onChange={(e) => updateProfile('coursework', e.target.value)} style={{ ...inputStyle, marginBottom: '18px' }} />

            {template.sections.filter((s) => s.type === 'stories').map((sec) => (
              <div key={sec.key} style={{ marginBottom: '14px' }}>
                <div
                  onClick={() => setExpanded((p) => ({ ...p, [sec.key]: !p[sec.key] }))}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
                >
                  <SectionLabel>{sec.label} ({stories.filter((s) => assignment[s.id] === sec.key).length})</SectionLabel>
                  <ChevronDown size={14} style={{ color: '#8B93A0', transform: expanded[sec.key] ? 'rotate(180deg)' : 'none' }} />
                </div>
                {expanded[sec.key] && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '8px' }}>
                    {stories.map((s) => (
                      <label key={s.id} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', fontSize: '12.5px', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={assignment[s.id] === sec.key}
                          onChange={(e) => reassign(s.id, sec.key, e.target.checked)}
                          style={{ marginTop: '2px', accentColor: '#4C8577' }}
                        />
                        <span>{s.title}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            ))}

            <SectionLabel>Skills</SectionLabel>
            <textarea
              value={skillsText}
              onChange={(e) => setSkillsText(e.target.value)}
              rows={2}
              style={{ ...inputStyle, resize: 'vertical', marginTop: '6px' }}
              placeholder="Comma-separated skills"
            />

            <div style={{ display: 'flex', gap: '8px', marginTop: '18px' }}>
              <button onClick={copyText} style={secondaryBtn}>
                {copied ? <Check size={14} /> : <Copy size={14} />} {copied ? 'Copied' : 'Copy text'}
              </button>
              <button onClick={downloadPDF} style={primaryBtn}>
                <Download size={14} /> Download PDF
              </button>
              <button onClick={downloadText} style={secondaryBtn}>
                <Download size={14} /> Download .txt
              </button>
            </div>
          </div>

          <ResumePreview profile={profile} template={template} assignment={assignment} stories={stories} skillsText={skillsText} />
        </div>
      )}
    </div>
  );
}

function SectionLabel({ children }) {
  return (
    <div style={{
      fontFamily: "'IBM Plex Mono', monospace", fontSize: '10.5px', textTransform: 'uppercase',
      letterSpacing: '0.06em', color: '#8B93A0',
    }}>
      {children}
    </div>
  );
}

function ExampleResumePanel() {
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: 'minmax(260px, 1fr) minmax(260px, 1fr)',
      gap: '20px', marginBottom: '28px', alignItems: 'start',
    }}>
      <div style={{
        background: '#F5F1E6', color: '#22201A', borderRadius: '4px',
        padding: '26px 28px', boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
      }}>
        <div style={{ fontFamily: "'Fraunces', serif", fontWeight: 600, fontSize: '19px' }}>NAME</div>
        <div style={{ fontSize: '11px', color: '#5A5540', marginTop: '3px', fontFamily: "'IBM Plex Mono', monospace" }}>
          State of residence • phone number • email • LinkedIn link
        </div>

        <ExampleSection label="Education">
          <div style={{ fontSize: '12.5px', lineHeight: 1.5 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Riverbend State University College of Business</span><span style={{ color: '#5A5540' }}>Riverbend, TX</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#5A5540' }}>
              <span>B.S. Business Administration – Finance</span><span>May 2028</span>
            </div>
          </div>
        </ExampleSection>

        <ExampleSection label="Professional Experience">
          <div style={{ fontSize: '12.5px', lineHeight: 1.5 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontWeight: 600 }}>Crestview Financial Group</span><span style={{ color: '#5A5540' }}>Dallas, TX</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#5A5540', marginBottom: '2px' }}>
              <span>Financial Analyst Intern</span><span>June 2026 – Aug 2026</span>
            </div>
            <div style={{ fontStyle: 'italic', color: '#5A5540', fontSize: '11.5px', marginBottom: '5px' }}>
              Regional financial services firm providing corporate finance and advisory support to mid-sized businesses
            </div>
            {EXAMPLE_BULLETS_EXPERIENCE.map((b) => (
              <div key={b} style={{ display: 'flex', gap: '6px', marginBottom: '3px' }}><span>•</span><span>{b}</span></div>
            ))}
          </div>
        </ExampleSection>

        <ExampleSection label="Leadership & Professional Development">
          <div style={{ fontSize: '12.5px', lineHeight: 1.5 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontWeight: 600 }}>Finance & Investment Society (FIS)</span><span style={{ color: '#5A5540' }}>Riverbend, TX</span>
            </div>
            <div style={{ color: '#5A5540', marginBottom: '5px' }}>Member — August 2025 – Present</div>
            {EXAMPLE_BULLETS_LEADERSHIP.map((b) => (
              <div key={b} style={{ display: 'flex', gap: '6px', marginBottom: '3px' }}><span>•</span><span>{b}</span></div>
            ))}
          </div>
        </ExampleSection>

        <ExampleSection label="Additional Information">
          <div style={{ fontSize: '12px', lineHeight: 1.6 }}>
            <div><strong>Technical Skills:</strong> Excel, PowerPoint, Tableau, QuickBooks</div>
            <div><strong>Certifications:</strong> Financial Modeling & Valuation Analyst (FMVA), Excel Skills for Business (Coursera)</div>
            <div><strong>Interests:</strong> Chess, Running, Video Editing, Volunteering</div>
          </div>
        </ExampleSection>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ background: '#1B212C', border: '1px solid #262E3B', borderRadius: '8px', padding: '16px' }}>
          <div style={{ fontFamily: "'Fraunces', serif", fontWeight: 600, fontSize: '13.5px', marginBottom: '8px', color: '#C79A3D' }}>
            Focus on relevant experience — more of it, done well
          </div>
          <div style={{ fontSize: '12px', lineHeight: 1.6, color: '#B8B3A4' }}>
            Prioritize internships, part-time roles, research, or freelance work tied to the field
            you're targeting. More relevant experience generally helps — but a stack of unrelated
            jobs does less for you than one or two internships in your actual career path. If you're
            choosing between adding another line or going deeper on the experience you already have,
            go deeper first.
          </div>
        </div>

        <div style={{ background: '#1B212C', border: '1px solid #262E3B', borderRadius: '8px', padding: '16px' }}>
          <div style={{ fontFamily: "'Fraunces', serif", fontWeight: 600, fontSize: '13.5px', marginBottom: '8px', color: '#C79A3D' }}>
            Numbers matter
          </div>
          <div style={{ fontSize: '12px', lineHeight: 1.6, color: '#B8B3A4', marginBottom: '10px' }}>
            Employers want to know what value you added, not just what you were assigned to do.
          </div>
          <div style={{ fontSize: '11.5px', color: '#B4694A', marginBottom: '3px' }}>Weak: "Helped with financial reports for clients."</div>
          <div style={{ fontSize: '11.5px', color: '#4C8577' }}>Strong: "Analyzed quarterly financial statements for 15+ client companies to identify cost-saving opportunities totaling $40K."</div>
          <div style={{ fontSize: '11.5px', color: '#8B93A0', marginTop: '10px', lineHeight: 1.6 }}>
            If a bullet has no number, try: how many people/clients/projects were involved,
            how much money/time/output you moved, or how often/how long it happened.
          </div>
        </div>
      </div>
    </div>
  );
}

function ExampleSection({ label, children }) {
  return (
    <div style={{ marginTop: '16px' }}>
      <div style={{
        fontSize: '10.5px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em',
        borderBottom: '1px solid #C9BE9E', paddingBottom: '3px', marginBottom: '6px', color: '#3A362C',
      }}>
        {label}
      </div>
      {children}
    </div>
  );
}

function ResumePreview({ profile, template, assignment, stories, skillsText }) {
  return (
    <div id="resume-print-target" style={{
      background: '#F5F1E6', color: '#22201A', borderRadius: '4px',
      padding: '28px 30px', boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
      position: 'sticky', top: '16px', minHeight: '400px',
    }}>
      <div style={{ fontFamily: "'Fraunces', serif", fontWeight: 600, fontSize: '20px', letterSpacing: '0.02em' }}>
        {profile.name || 'Your Name'}
      </div>
      <div style={{ fontSize: '11.5px', color: '#5A5540', marginTop: '3px', fontFamily: "'IBM Plex Mono', monospace" }}>
        {[profile.email, profile.phone, profile.location].filter(Boolean).join('   •   ') || 'email  •  phone  •  location'}
      </div>

      {template.sections.map((sec) => (
        <div key={sec.key} style={{ marginTop: '18px' }}>
          <div style={{
            fontSize: '11.5px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em',
            borderBottom: '1px solid #C9BE9E', paddingBottom: '3px', color: '#3A362C',
          }}>
            {sec.label}
          </div>
          {sec.type === 'education' ? (
            <div style={{ fontSize: '12.5px', marginTop: '7px', lineHeight: 1.5 }}>
              <div>{[profile.school, profile.degree].filter(Boolean).join(' — ') || 'School — Degree'}</div>
              <div style={{ color: '#5A5540' }}>
                {[profile.gradDate, profile.gpa ? `GPA ${profile.gpa}` : ''].filter(Boolean).join('   •   ')}
              </div>
              {profile.coursework && <div style={{ color: '#5A5540' }}>Relevant coursework: {profile.coursework}</div>}
            </div>
          ) : sec.type === 'skills' ? (
            <div style={{ fontSize: '12.5px', marginTop: '7px', lineHeight: 1.5 }}>{skillsText || '—'}</div>
          ) : (
            <div style={{ marginTop: '7px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
              {stories.filter((s) => assignment[s.id] === sec.key).length === 0 && (
                <div style={{ fontSize: '12px', color: '#8B8264', fontStyle: 'italic' }}>No stories assigned yet</div>
              )}
              {stories.filter((s) => assignment[s.id] === sec.key).map((s) => (
                <div key={s.id} style={{ fontSize: '12.5px', lineHeight: 1.45, display: 'flex', gap: '6px' }}>
                  <span>•</span><span>{s.description}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

/* ---------------- Resume Builder ---------------- */

function ResumeBuilder({ stories }) {
  const [posting, setPosting] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [matches, setMatches] = useState(null);
  const [included, setIncluded] = useState({});
  const [copied, setCopied] = useState(false);

  async function runMatch() {
    if (!posting.trim() || stories.length === 0) return;
    setLoading(true);
    setError(null);
    setMatches(null);
    setCopied(false);
    try {
      const storyPayload = stories.map((s) => ({
        id: s.id, title: s.title, description: s.description,
        competency: s.competency, tags: s.tags,
      }));

      const prompt = `You are helping a college student or recent grad with limited work history match their personal story bank against a job posting. Their stories are likely class projects, part-time jobs, internships, student orgs, and volunteering rather than full-time corporate roles — that is normal and expected, not a weakness to apologize for.

JOB POSTING:
"""${posting.trim().slice(0, 6000)}"""

STORY BANK (JSON):
${JSON.stringify(storyPayload)}

For each story that is genuinely relevant to this job posting (relevance score 35 or higher out of 100), write ONE resume bullet point that:
- Translates the campus/academic/part-time experience into the professional vocabulary and priorities of THIS job posting, without inflating or fabricating scope
- Is under 22 words
- Keeps any concrete number or named outcome from the original story if one exists
- Uses active voice, past tense, no personal pronouns
- Names the transferable skill plainly if the setting (e.g. "class project," "student club") is unavoidable — do not pretend a class project was a job

Return ONLY a JSON object, no markdown fences, no commentary, in this exact shape:
{"matches":[{"storyId":"<id>","score":<0-100 integer>,"bullet":"<bullet text>"}]}

Sort matches by score descending. Omit stories that don't clear the 35 threshold. If nothing clears the threshold, return {"matches":[]}.`;

      const response = await fetch('/api/claude', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6',
          max_tokens: 1000,
          messages: [{ role: 'user', content: prompt }],
        }),
      });
      const data = await response.json();
      const text = (data.content || []).map((b) => b.text || '').join('\n');
      const clean = text.replace(/```json|```/g, '').trim();
      const parsed = JSON.parse(clean);
      const withStories = (parsed.matches || [])
        .map((m) => ({ ...m, story: stories.find((s) => s.id === m.storyId) }))
        .filter((m) => m.story);
      setMatches(withStories);
      const initIncluded = {};
      withStories.forEach((m) => { initIncluded[m.storyId] = true; });
      setIncluded(initIncluded);

      try {
        const histRes = await window.storage.get('applications');
        const hist = histRes && histRes.value ? JSON.parse(histRes.value) : [];
        hist.unshift({
          id: uid(),
          date: new Date().toISOString(),
          snippet: posting.trim().slice(0, 90),
          matchCount: withStories.length,
        });
        await window.storage.set('applications', JSON.stringify(hist.slice(0, 20)));
      } catch (e) { /* history is best-effort */ }
    } catch (e) {
      setError('Something went wrong matching your stories — try again in a moment.');
    } finally {
      setLoading(false);
    }
  }

  function toggleIncluded(id) {
    setIncluded((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  async function copyBullets() {
    const text = matches
      .filter((m) => included[m.storyId])
      .map((m) => `• ${m.bullet}`)
      .join('\n');
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      setError('Copy failed — select and copy the bullets manually.');
    }
  }

  if (stories.length === 0) {
    return (
      <div style={{ padding: '48px 28px', textAlign: 'center', color: '#8B93A0', fontSize: '13.5px' }}>
        You'll need a few stories in your Story Bank before matching against a job posting.
      </div>
    );
  }

  return (
    <div style={{ padding: '24px 28px 32px' }}>
      <textarea
        placeholder="Paste the job posting here…"
        value={posting}
        onChange={(e) => setPosting(e.target.value)}
        rows={7}
        style={{ ...inputStyle, fontFamily: "'Inter', sans-serif", resize: 'vertical' }}
      />
      <button
        onClick={runMatch}
        disabled={loading || !posting.trim()}
        style={{
          ...primaryBtn, marginTop: '12px',
          opacity: loading || !posting.trim() ? 0.5 : 1,
          cursor: loading || !posting.trim() ? 'default' : 'pointer',
        }}
      >
        {loading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
        {loading ? 'Matching your stories…' : 'Match my stories to this posting'}
      </button>

      {error && (
        <div style={{ color: '#B4694A', fontSize: '13px', marginTop: '12px' }}>{error}</div>
      )}

      {matches && matches.length === 0 && !loading && (
        <div style={{ marginTop: '20px', color: '#8B93A0', fontSize: '13.5px' }}>
          None of your stories cleared a strong match for this posting. That's useful signal —
          it might be worth adding a story that speaks more directly to what this role needs.
        </div>
      )}

      {matches && matches.length > 0 && (
        <div style={{ marginTop: '24px' }}>
          <div style={{ fontSize: '12px', color: '#8B93A0', marginBottom: '12px', fontFamily: "'IBM Plex Mono', monospace" }}>
            {matches.length} matching {matches.length === 1 ? 'story' : 'stories'} — uncheck any you don't want in the draft
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {matches.map((m) => (
              <MatchCard key={m.storyId} match={m} checked={!!included[m.storyId]} onToggle={() => toggleIncluded(m.storyId)} />
            ))}
          </div>
          <button onClick={copyBullets} style={{ ...secondaryBtn, marginTop: '18px' }}>
            {copied ? <Check size={14} /> : <Copy size={14} />}
            {copied ? 'Copied' : 'Copy selected bullets'}
          </button>
        </div>
      )}
    </div>
  );
}

function MatchCard({ match, checked, onToggle }) {
  const meta = competencyMeta(match.story.competency);
  return (
    <div style={{
      display: 'flex', gap: '12px', alignItems: 'flex-start',
      background: '#1B212C', border: '1px solid #262E3B', borderRadius: '8px', padding: '14px',
      opacity: checked ? 1 : 0.5,
    }}>
      <input type="checkbox" checked={checked} onChange={onToggle} style={{ marginTop: '4px', accentColor: '#4C8577', width: '15px', height: '15px', flexShrink: 0 }} />
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '11px', fontFamily: "'IBM Plex Mono', monospace", color: meta.color, border: `1px solid ${meta.color}`, padding: '1px 6px', borderRadius: '3px' }}>
            {meta.label}
          </span>
          <span style={{ fontSize: '11px', color: '#8B93A0' }}>from "{match.story.title}"</span>
          <span style={{ marginLeft: 'auto', fontFamily: "'IBM Plex Mono', monospace", fontSize: '11px', color: '#C79A3D' }}>
            {match.score}% match
          </span>
        </div>
        <div style={{ fontSize: '14px', lineHeight: 1.5 }}>{match.bullet}</div>
        <div style={{
          height: '3px', background: '#262E3B', borderRadius: '2px', marginTop: '10px', overflow: 'hidden',
        }}>
          <div style={{ height: '100%', width: `${match.score}%`, background: '#C79A3D' }} />
        </div>
      </div>
    </div>
  );
}

/* ---------------- Interview Prep ---------------- */

function InterviewPrep({ stories }) {
  const [posting, setPosting] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [prep, setPrep] = useState(null);
  const [activeQuestion, setActiveQuestion] = useState(null);
  const [answer, setAnswer] = useState('');
  const [feedback, setFeedback] = useState(null);
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [feedbackError, setFeedbackError] = useState(null);
  const mockRef = useRef(null);

  async function runPrep() {
    if (!posting.trim()) return;
    setLoading(true);
    setError(null);
    setPrep(null);
    setActiveQuestion(null);
    setFeedback(null);
    try {
      const prompt = `You are helping a college student or recent grad prepare for an interview for the role below.

JOB POSTING:
"""${posting.trim().slice(0, 6000)}"""

Produce:
1. "tips": 4-6 short, specific interview tips for this particular role and posting (not generic advice like "be confident" — tie each tip to something in the posting, like the industry, the seniority level, or a skill it emphasizes).
2. "questions": 8-10 likely interview questions for this role, each tagged with a category. Use these categories: "Behavioral", "Role-specific", "Culture fit", "Ask them" (questions the candidate should ask the interviewer). Include at least one question in each category.

Return ONLY a JSON object, no markdown fences, no commentary, in this exact shape:
{"tips":["...","..."],"questions":[{"category":"Behavioral","question":"..."}]}`;

      const response = await fetch('/api/claude', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6',
          max_tokens: 1000,
          messages: [{ role: 'user', content: prompt }],
        }),
      });
      const data = await response.json();
      const text = (data.content || []).map((b) => b.text || '').join('\n');
      const clean = text.replace(/```json|```/g, '').trim();
      const parsed = JSON.parse(clean);
      setPrep(parsed);
    } catch (e) {
      setError('Something went wrong generating interview prep — try again in a moment.');
    } finally {
      setLoading(false);
    }
  }

  function practiceQuestion(q) {
    setActiveQuestion(q);
    setAnswer('');
    setFeedback(null);
    setFeedbackError(null);
    setTimeout(() => mockRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  }

  async function getFeedback() {
    if (!answer.trim() || !activeQuestion) return;
    setFeedbackLoading(true);
    setFeedbackError(null);
    setFeedback(null);
    try {
      const prompt = `A college student is practicing this interview question:
"${activeQuestion.question}"

Their spoken answer (transcribed) was:
"""${answer.trim().slice(0, 3000)}"""

Give brief, direct feedback a career coach would give:
1. "strength": one specific thing that worked in the answer (1-2 sentences)
2. "improve": one specific, actionable thing to change (1-2 sentences) — if the answer lacks a concrete outcome or number, say so plainly
3. "structure": one sentence on whether the answer follows a clear situation → action → result shape, or feels unstructured/rambling

Return ONLY a JSON object, no markdown fences, no commentary:
{"strength":"...","improve":"...","structure":"..."}`;

      const response = await fetch('/api/claude', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6',
          max_tokens: 1000,
          messages: [{ role: 'user', content: prompt }],
        }),
      });
      const data = await response.json();
      const text = (data.content || []).map((b) => b.text || '').join('\n');
      const clean = text.replace(/```json|```/g, '').trim();
      const parsed = JSON.parse(clean);
      setFeedback(parsed);
    } catch (e) {
      setFeedbackError("Couldn't get feedback just now — try again.");
    } finally {
      setFeedbackLoading(false);
    }
  }

  const wordCount = answer.trim() ? answer.trim().split(/\s+/).length : 0;
  const isLong = wordCount > 180;

  return (
    <div style={{ padding: '24px 28px 40px' }}>
      <div style={{ fontSize: '13px', color: '#8B93A0', marginBottom: '14px', lineHeight: 1.5, maxWidth: '560px' }}>
        Paste a job posting and get tailored interview questions, quick tips, and a space to
        practice an answer and get feedback — pulling in your Story Bank where it fits.
      </div>

      <textarea
        placeholder="Paste the job posting here…"
        value={posting}
        onChange={(e) => setPosting(e.target.value)}
        rows={7}
        style={{ ...inputStyle, fontFamily: "'Inter', sans-serif", resize: 'vertical' }}
      />
      <button
        onClick={runPrep}
        disabled={loading || !posting.trim()}
        style={{
          ...primaryBtn, marginTop: '12px',
          opacity: loading || !posting.trim() ? 0.5 : 1,
          cursor: loading || !posting.trim() ? 'default' : 'pointer',
        }}
      >
        {loading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
        {loading ? 'Building your prep…' : 'Get interview prep'}
      </button>

      {error && <div style={{ color: '#B4694A', fontSize: '13px', marginTop: '12px' }}>{error}</div>}

      {prep && (
        <div style={{ marginTop: '28px', display: 'flex', flexDirection: 'column', gap: '28px' }}>
          {/* Tips */}
          <div>
            <SectionLabel>Tips for this role</SectionLabel>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '10px' }}>
              {(prep.tips || []).map((tip, i) => (
                <div key={i} style={{
                  display: 'flex', gap: '8px', alignItems: 'flex-start',
                  background: '#1B212C', border: '1px solid #262E3B', borderRadius: '8px', padding: '11px 13px',
                }}>
                  <Lightbulb size={14} style={{ color: '#C79A3D', flexShrink: 0, marginTop: '2px' }} />
                  <span style={{ fontSize: '12.5px', lineHeight: 1.5 }}>{tip}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Sample questions */}
          <div>
            <SectionLabel>Sample questions — pick one to practice</SectionLabel>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '10px' }}>
              {(prep.questions || []).map((q, i) => (
                <button
                  key={i}
                  onClick={() => practiceQuestion(q)}
                  style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px',
                    textAlign: 'left', background: activeQuestion?.question === q.question ? '#232C22' : '#1B212C',
                    border: activeQuestion?.question === q.question ? '1px solid #4C8577' : '1px solid #262E3B',
                    borderRadius: '8px', padding: '11px 13px', cursor: 'pointer', color: '#E9E5D8',
                  }}
                >
                  <span>
                    <span style={{
                      fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px', color: '#4C8577',
                      textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '3px',
                    }}>
                      {q.category}
                    </span>
                    <span style={{ fontSize: '13px', lineHeight: 1.4 }}>{q.question}</span>
                  </span>
                  <ArrowRight size={14} style={{ color: '#8B93A0', flexShrink: 0 }} />
                </button>
              ))}
            </div>
          </div>

          {/* Mock interview */}
          <div ref={mockRef}>
            <SectionLabel>Mock interview</SectionLabel>
            {!activeQuestion ? (
              <div style={{ fontSize: '12.5px', color: '#8B93A0', marginTop: '10px' }}>
                Pick a question above to practice answering it.
              </div>
            ) : (
              <div style={{ marginTop: '10px' }}>
                <div style={{
                  background: '#1B212C', border: '1px solid #262E3B', borderRadius: '8px',
                  padding: '13px', fontSize: '13.5px', marginBottom: '10px',
                }}>
                  {activeQuestion.question}
                </div>

                {stories.length > 0 && (() => {
                  const suggested = suggestStoriesForQuestion(activeQuestion.question, stories);
                  return suggested.length > 0 ? (
                    <div style={{ fontSize: '11.5px', color: '#8B93A0', marginBottom: '10px' }}>
                      From your Story Bank, this might fit:{' '}
                      {suggested.map((s) => (
                        <span key={s.id} style={{
                          fontFamily: "'IBM Plex Mono', monospace", color: '#4C8577',
                          border: '1px solid #4C8577', borderRadius: '3px', padding: '1px 6px', marginRight: '5px',
                        }}>
                          {s.title}
                        </span>
                      ))}
                    </div>
                  ) : null;
                })()}

                <textarea
                  placeholder="Type your answer as you'd say it out loud…"
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  rows={6}
                  style={{ ...inputStyle, fontFamily: "'Inter', sans-serif", resize: 'vertical' }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
                  <span style={{ fontSize: '11px', color: isLong ? '#C79A3D' : '#8B93A0' }}>
                    {wordCount} words{isLong ? ' — that\'s a lot to say out loud; interviewers often lose the thread past ~90 seconds' : ''}
                  </span>
                </div>

                <button
                  onClick={getFeedback}
                  disabled={feedbackLoading || !answer.trim()}
                  style={{
                    ...primaryBtn, marginTop: '10px',
                    opacity: feedbackLoading || !answer.trim() ? 0.5 : 1,
                    cursor: feedbackLoading || !answer.trim() ? 'default' : 'pointer',
                  }}
                >
                  {feedbackLoading ? <Loader2 size={14} className="animate-spin" /> : <MessageCircle size={14} />}
                  {feedbackLoading ? 'Reading your answer…' : 'Get feedback'}
                </button>

                {feedbackError && <div style={{ color: '#B4694A', fontSize: '13px', marginTop: '10px' }}>{feedbackError}</div>}

                {feedback && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '14px' }}>
                    <FeedbackRow label="What worked" color="#4C8577" text={feedback.strength} />
                    <FeedbackRow label="What to change" color="#C79A3D" text={feedback.improve} />
                    <FeedbackRow label="Structure" color="#8C6FA0" text={feedback.structure} />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function FeedbackRow({ label, color, text }) {
  if (!text) return null;
  return (
    <div style={{ background: '#1B212C', border: '1px solid #262E3B', borderRadius: '8px', padding: '11px 13px' }}>
      <div style={{
        fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px', color, textTransform: 'uppercase',
        letterSpacing: '0.05em', marginBottom: '4px',
      }}>
        {label}
      </div>
      <div style={{ fontSize: '12.5px', lineHeight: 1.5 }}>{text}</div>
    </div>
  );
}

/* ---------------- shared styles ---------------- */

const inputStyle = {
  width: '100%', boxSizing: 'border-box',
  background: '#12151C', color: '#E9E5D8',
  border: '1px solid #262E3B', borderRadius: '6px',
  padding: '10px 12px', fontSize: '13.5px',
  outline: 'none', fontFamily: "'Inter', sans-serif",
};

const primaryBtn = {
  display: 'flex', alignItems: 'center', gap: '8px',
  background: '#C79A3D', color: '#12151C', fontWeight: 600,
  border: 'none', borderRadius: '8px', padding: '10px 16px',
  fontSize: '13.5px', cursor: 'pointer',
};

const secondaryBtn = {
  display: 'flex', alignItems: 'center', gap: '8px',
  background: 'transparent', color: '#8B93A0',
  border: '1px solid #262E3B', borderRadius: '8px', padding: '10px 16px',
  fontSize: '13.5px', cursor: 'pointer',
};

const cardActionBtn = {
  display: 'flex', alignItems: 'center', gap: '4px',
  background: 'none', border: 'none', color: '#5A5540',
  fontSize: '11.5px', cursor: 'pointer', padding: 0, fontFamily: "'Inter', sans-serif",
};
