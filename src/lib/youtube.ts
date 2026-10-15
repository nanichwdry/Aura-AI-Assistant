interface YouTubePlayer {
  loadVideoById(id: string): void;
  playVideo(): void;
  pauseVideo(): void;
  destroy(): void;
}
interface PlayerEvent { data: number }
export interface YouTubeAPI {
  Player: new (element: HTMLElement, options: {
    width: string; height: string;
    playerVars: Record<string, string | number>;
    events: { onReady: () => void; onStateChange: (event: PlayerEvent) => void; onError: () => void; onAutoplayBlocked: () => void };
  }) => YouTubePlayer;
}
let pending: Promise<YouTubeAPI> | undefined;
export function loadYouTube(): Promise<YouTubeAPI> {
  const api = () => (window as Window & { YT?: YouTubeAPI }).YT;
  if (api()?.Player) return Promise.resolve(api()!);
  if (pending) return pending;
  pending = new Promise<YouTubeAPI>((resolve, reject) => {
    let script = document.querySelector<HTMLScriptElement>('script[src="https://www.youtube.com/iframe_api"]');
    const created = !script;
    if (!script) { script = document.createElement('script'); script.src = 'https://www.youtube.com/iframe_api'; script.async = true; }
    const cleanup = () => { clearInterval(poll); clearTimeout(timeout); script!.removeEventListener('error', fail); };
    const fail = () => { cleanup(); script!.remove(); reject(new Error('YouTube could not load. Check your connection and reopen Music.')); };
    const poll = setInterval(() => { if (api()?.Player) { cleanup(); resolve(api()!); } }, 50);
    const timeout = setTimeout(fail, 15000);
    script.addEventListener('error', fail);
    if (created) document.head.appendChild(script);
  }).catch(error => { pending = undefined; throw error; });
  return pending;
}
