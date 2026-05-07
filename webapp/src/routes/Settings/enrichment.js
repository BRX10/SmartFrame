import { useEffect, useState } from "react";
import { GetEnrichmentSettings, UpdateEnrichmentSettings } from "../../services/settingsServices";
import Alert from "../../components/alert";
import Spinner from "../../components/spinner";

const GROQ_MODELS = [
    "llama-3.1-8b-instant",
    "llama-3.3-70b-versatile",
    "gemma2-9b-it",
    "mixtral-8x7b-32768",
];

export default function EnrichmentSettings({ token }) {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [alert, setAlert] = useState(false);
    const [alertType, setAlertType] = useState("");
    const [alertMsg, setAlertMsg] = useState("");

    const [model, setModel] = useState("llama-3.1-8b-instant");
    const [prompt, setPrompt] = useState("");
    const [temperature, setTemperature] = useState(0.3);
    const [groqKey, setGroqKey] = useState("");
    const [lastfmKey, setLastfmKey] = useState("");
    const [groqConfigured, setGroqConfigured] = useState(false);
    const [lastfmConfigured, setLastfmConfigured] = useState(false);

    useEffect(() => {
        GetEnrichmentSettings(token)
            .then(data => {
                setModel(data.groq_model_name || "llama-3.1-8b-instant");
                setPrompt(data.groq_system_prompt || "");
                setTemperature(parseFloat(data.groq_temperature || "0.3"));
                setGroqConfigured(data.groq_api_key === "configured");
                setLastfmConfigured(data.lastfm_api_key === "configured");
                setGroqKey("");
                setLastfmKey("");
                setLoading(false);
            })
            .catch(err => {
                setAlert(true);
                setAlertType("error");
                setAlertMsg("Erreur de chargement : " + err.message);
                setLoading(false);
            });
    }, [token]);

    function save(fields) {
        setSaving(true);
        setAlert(false);
        UpdateEnrichmentSettings(token, fields)
            .then(() => {
                setSaving(false);
                setAlert(true);
                setAlertType("sucess");
                setAlertMsg("Configuration mise à jour");
                // Marquer les clés comme configurées si elles ont été envoyées
                if (fields.groq_api_key) setGroqConfigured(true);
                if (fields.lastfm_api_key) setLastfmConfigured(true);
            })
            .catch(err => {
                setSaving(false);
                setAlert(true);
                setAlertType("error");
                setAlertMsg("Erreur : " + err.message);
            });
    }

    if (loading) return <Spinner className="mt-20" />;

    return (
        <div className="max-w-2xl mx-auto px-4 py-6">
            <Alert
                className="mb-6"
                alert={alert}
                typeAlert={alertType}
                messageAlert={alertMsg}
                onClose={() => setAlert(false)}
            />

            {/* Header */}
            <div className="mb-6">
                <h2 className="text-lg font-semibold text-zinc-100">Enrichissement IA</h2>
                <p className="text-xs text-zinc-500 mt-1">
                    Configure l'extraction de phrases clés (hook) depuis les paroles des morceaux via Groq.
                </p>
            </div>

            {/* Clés API */}
            <div className="rounded-xl border border-zinc-800 bg-zinc-800/50 p-4 mb-4">
                <h3 className="text-xs text-zinc-400 uppercase tracking-wider font-medium mb-3">Clés API</h3>

                <div className="space-y-3">
                    <div>
                        <label className="text-xs text-zinc-500 block mb-1">
                            Groq API Key
                            {groqConfigured && <span className="ml-2 text-green-500 text-[10px]">● configurée</span>}
                        </label>
                        <div className="flex gap-2">
                            <input
                                type="password"
                                value={groqKey}
                                onChange={e => setGroqKey(e.target.value)}
                                placeholder={groqConfigured ? "••••••••" : "gsk_..."}
                                className="flex-1 bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-1.5 text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-orange-500"
                            />
                            <button
                                onClick={() => { if (groqKey) save({ groq_api_key: groqKey }); }}
                                disabled={!groqKey || saving}
                                className="px-3 py-1.5 text-xs font-medium rounded-lg bg-orange-500 hover:bg-orange-400 text-white disabled:opacity-30 transition-colors"
                            >
                                Sauver
                            </button>
                        </div>
                    </div>

                    <div>
                        <label className="text-xs text-zinc-500 block mb-1">
                            Last.fm API Key
                            {lastfmConfigured && <span className="ml-2 text-green-500 text-[10px]">● configurée</span>}
                        </label>
                        <div className="flex gap-2">
                            <input
                                type="password"
                                value={lastfmKey}
                                onChange={e => setLastfmKey(e.target.value)}
                                placeholder={lastfmConfigured ? "••••••••" : "Clé API Last.fm"}
                                className="flex-1 bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-1.5 text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-orange-500"
                            />
                            <button
                                onClick={() => { if (lastfmKey) save({ lastfm_api_key: lastfmKey }); }}
                                disabled={!lastfmKey || saving}
                                className="px-3 py-1.5 text-xs font-medium rounded-lg bg-orange-500 hover:bg-orange-400 text-white disabled:opacity-30 transition-colors"
                            >
                                Sauver
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Modèle & Température */}
            <div className="rounded-xl border border-zinc-800 bg-zinc-800/50 p-4 mb-4">
                <h3 className="text-xs text-zinc-400 uppercase tracking-wider font-medium mb-3">Modèle LLM</h3>

                <div className="space-y-3">
                    <div>
                        <label className="text-xs text-zinc-500 block mb-1">Modèle Groq</label>
                        <div className="grid grid-cols-2 gap-2">
                            {GROQ_MODELS.map(m => (
                                <button
                                    key={m}
                                    onClick={() => { setModel(m); save({ groq_model_name: m }); }}
                                    disabled={saving}
                                    className={`rounded-lg border-2 px-3 py-2 text-xs transition-all ${
                                        model === m
                                            ? 'border-orange-500 bg-orange-500/10 text-orange-400'
                                            : 'border-zinc-700 bg-zinc-900 text-zinc-400 hover:border-zinc-600'
                                    } disabled:opacity-50`}
                                >
                                    {m}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="text-xs text-zinc-500 block mb-1">Température</label>
                        <div className="flex items-center gap-3">
                            <input
                                type="range"
                                min="0"
                                max="1"
                                step="0.1"
                                value={temperature}
                                onChange={e => setTemperature(parseFloat(e.target.value))}
                                onMouseUp={e => save({ groq_temperature: e.target.value })}
                                onTouchEnd={e => save({ groq_temperature: e.target.value })}
                                className="flex-1 h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-orange-500"
                            />
                            <span className="text-xs text-zinc-300 font-medium w-8 text-right">
                                {temperature.toFixed(1)}
                            </span>
                        </div>
                        <p className="text-[10px] text-zinc-600 mt-1">0 = déterministe, 1 = créatif</p>
                    </div>
                </div>
            </div>

            {/* Prompt système */}
            <div className="rounded-xl border border-zinc-800 bg-zinc-800/50 p-4 mb-4">
                <h3 className="text-xs text-zinc-400 uppercase tracking-wider font-medium mb-3">Prompt système</h3>
                <textarea
                    value={prompt}
                    onChange={e => setPrompt(e.target.value)}
                    rows={6}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-orange-500 resize-none leading-relaxed"
                />
                <div className="flex justify-between items-center mt-2">
                    <p className="text-[10px] text-zinc-600">
                        Ce prompt est envoyé à Groq pour extraire la phrase clé des paroles.
                    </p>
                    <button
                        onClick={() => save({ groq_system_prompt: prompt })}
                        disabled={saving}
                        className="px-4 py-1.5 text-xs font-medium rounded-lg bg-orange-500 hover:bg-orange-400 text-white disabled:opacity-50 transition-colors"
                    >
                        {saving ? "..." : "Sauver le prompt"}
                    </button>
                </div>
            </div>

            {/* Info */}
            <div className="rounded-xl border border-zinc-800/50 bg-zinc-900/30 p-4">
                <h3 className="text-xs text-zinc-500 uppercase tracking-wider font-medium mb-2">Comment ça marche</h3>
                <ul className="text-[11px] text-zinc-500 space-y-1.5">
                    <li>→ Quand un morceau joue, le système cherche les paroles sur LRCLIB</li>
                    <li>→ Si trouvées, Groq extrait une phrase clé (hook) avec le prompt ci-dessus</li>
                    <li>→ La phrase s'affiche en citation sur le cadre e-paper</li>
                    <li>→ Les résultats sont mis en cache : un morceau déjà enrichi s'affiche instantanément</li>
                    <li>→ Si le cache n'a pas de hook phrase, le système retente automatiquement</li>
                </ul>
            </div>
        </div>
    );
}
