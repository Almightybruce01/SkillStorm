/* SPACE SHOOTER — Enhanced with enemies, powerups, bosses, parallax */
import { useRef, useEffect, useState, useCallback } from 'react';
import { getRandomQuestion, generateMathQuestion, type Grade, type Question } from '../questionBank';
import { sfxShoot, sfxExplosion, sfxCorrect, sfxWrong, sfxGameOver, sfxLevelUp, sfxCoin } from '../SoundEngine';

type EnemyKind = 'asteroid' | 'comet' | 'drone' | 'boss';
type PwrType = 'shield' | 'rapid' | 'bomb' | 'slow' | 'x2';
interface Enemy { x: number; y: number; vx: number; vy: number; r: number; rot: number; rs: number; text: string; ok: boolean; kind: EnemyKind; hp: number; mhp: number; trail?: {x:number;y:number;a:number}[]; sc?: number; }
interface Bullet { x: number; y: number; vy: number; vx: number; }
interface Ptcl { x: number; y: number; vx: number; vy: number; life: number; ml: number; c: string; s: number; boss?: boolean; }
interface Pwr { x: number; y: number; vy: number; t: PwrType; }
interface Star { x: number; y: number; sz: number; sp: number; b: number; }

const HS = 'ss_hi';

export function SpaceShooter({ gameId, grade, onClose }: { gameId: string; grade: string; onClose: () => void }) {
  const g = grade as Grade;
  const cvs = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [level, setLevel] = useState(1);
  const [over, setOver] = useState(false);
  const [gate, setGate] = useState(false);
  const [gQ, setGQ] = useState<Question>(() => getRandomQuestion(g));
  const [hi, setHi] = useState(() => parseInt(localStorage.getItem(HS)||'0',10));
  const st = useRef({s:0,l:3,lv:1,go:false,gt:false,co:0,hi:0,sh:false,rf:0,x2:0,sl:0,bc:0,fc:0,su:0,sm:0});

  const run = useCallback(() => {
    const c = cvs.current; if(!c) return;
    const ctx = c.getContext('2d'); if(!ctx) return;
    const dpr = Math.min(2, devicePixelRatio||1);
    const W = c.width = Math.floor(c.offsetWidth*dpr);
    const H = c.height = Math.floor(c.offsetHeight*dpr);
    const S = st.current;
    let sx = W/2, sy = H*0.88;
    const bul: Bullet[] = [], ens: Enemy[] = [], pts: Ptcl[] = [], pws: Pwr[] = [];
    const stars: Star[] = [];
    let ls = 0, f = 0, ng = 500, ba = false;
    for(let i=0;i<140;i++) stars.push({x:Math.random()*W,y:Math.random()*H,sz:0.5+Math.random()*2,sp:0.3+Math.random()*1.2,b:0.3+Math.random()*0.7});

    function spawn() {
      const q = gameId.includes('vocab') ? getRandomQuestion(g,'vocabulary') : generateMathQuestion(g);
      const k: EnemyKind = Math.random()<0.12?'comet':Math.random()<0.08?'drone':'asteroid';
      q.options.forEach(o => {
        ens.push({x:40+Math.random()*(W-80),y:-40-Math.random()*60,vx:(Math.random()-0.5)*(k==='comet'?4:1.5),vy:0.8+Math.random()*0.6+S.lv*0.15+(k==='comet'?2:0),r:k==='drone'?16:k==='comet'?20:22+Math.random()*12,rot:Math.random()*6.28,rs:(Math.random()-0.5)*0.06,text:o,ok:o===q.answer,kind:k,hp:k==='drone'?2:1,mhp:k==='drone'?2:1,trail:k==='comet'?[]:undefined});
      });
    }
    function spawnBoss() {
      const q = generateMathQuestion(g);
      ens.push({x:W/2,y:-80,vx:1.5,vy:0.3,r:50,rot:0,rs:0.01,text:q.answer,ok:true,kind:'boss',hp:15+S.lv*5,mhp:15+S.lv*5,sc:0});
      ba = true;
    }
    function spawnPwr(x:number,y:number) { const ts:PwrType[]=['shield','rapid','bomb','slow','x2']; pws.push({x,y,vy:1.5,t:ts[Math.floor(Math.random()*ts.length)]}); }
    function boom(x:number,y:number,c:string,n:number) { for(let i=0;i<n;i++){const a=6.28*i/n+Math.random()*0.5,sp=2+Math.random()*5;pts.push({x,y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,life:25+Math.random()*15,ml:40,c,s:2+Math.random()*4});} }
    function shake(m:number,d:number) { S.su=f+d; S.sm=m; }

    const keys = new Set<string>();
    const kd = (e:KeyboardEvent)=>{keys.add(e.key.toLowerCase());if(e.key===' ')e.preventDefault();if(e.key==='b'&&S.bc>0){S.bc--;ens.forEach(e=>boom(e.x,e.y,'#ff6600',8));ens.length=0;shake(8,15);sfxExplosion();}};
    const ku = (e:KeyboardEvent)=>keys.delete(e.key.toLowerCase());
    let mx = W/2;
    const mm = (e:MouseEvent)=>{const r=c.getBoundingClientRect();mx=(e.clientX-r.left)*(W/r.width);};
    const tm = (e:TouchEvent)=>{const r=c.getBoundingClientRect();mx=(e.touches[0].clientX-r.left)*(W/r.width);};
    window.addEventListener('keydown',kd); window.addEventListener('keyup',ku);
    c.addEventListener('mousemove',mm); c.addEventListener('touchmove',tm,{passive:true});

    function upd() {
      if(S.go||S.gt) return;
      f++; S.fc=f;
      const sl = S.sl>f?0.3:1;
      if(keys.has('arrowleft')||keys.has('a')) sx-=8;
      if(keys.has('arrowright')||keys.has('d')) sx+=8;
      sx+=(mx-sx)*0.08; sx=Math.max(20,Math.min(W-20,sx));
      const fr = S.rf>f?4:12;
      if(f-ls>=fr){ls=f;bul.push({x:sx,y:sy-15,vy:-12,vx:0});if(S.rf>f){bul.push({x:sx-8,y:sy-10,vy:-11,vx:-1});bul.push({x:sx+8,y:sy-10,vy:-11,vx:1});}sfxShoot();}
      if(f%Math.max(25,60-S.lv*3)===0&&!ba) spawn();
      if(S.lv>0&&S.lv%5===0&&!ba&&!ens.some(e=>e.kind==='boss')) spawnBoss();

      for(let i=bul.length-1;i>=0;i--){
        const b=bul[i]; b.y+=b.vy*sl; b.x+=b.vx*sl;
        if(b.y<-10||b.x<-10||b.x>W+10){bul.splice(i,1);continue;}
        for(let j=ens.length-1;j>=0;j--){
          const e=ens[j];
          if(Math.hypot(b.x-e.x,b.y-e.y)<e.r+6){
            bul.splice(i,1); e.hp--;
            if(e.hp<=0){
              boom(e.x,e.y,e.kind==='boss'?'#ff0066':e.kind==='comet'?'#00ccff':'#ff8800',e.kind==='boss'?40:15);
              if(e.kind==='boss'){shake(10,20);ba=false;}
              if(e.ok){S.co++;const m=S.x2>f?2:1;const p=(e.kind==='boss'?200:e.kind==='comet'?30:10)*m*Math.min(S.co,5);S.s+=p;setScore(S.s);if(S.s>S.hi){S.hi=S.s;setHi(S.s);try{localStorage.setItem(HS,String(S.s));}catch{}}if(Math.random()<0.12)spawnPwr(e.x,e.y);sfxCoin();}else{S.co=0;}
              ens.splice(j,1);sfxExplosion();
              if(S.s>=ng){ng+=500;S.gt=true;setGate(true);setGQ(getRandomQuestion(g));}
            }
            break;
          }
        }
      }

      for(let i=ens.length-1;i>=0;i--){
        const e=ens[i]; e.x+=e.vx*sl; e.y+=e.vy*sl; e.rot+=e.rs;
        if(e.kind==='comet'&&e.trail){e.trail.unshift({x:e.x,y:e.y,a:1});if(e.trail.length>15)e.trail.pop();e.trail.forEach(t=>t.a*=0.92);}
        if(e.kind==='drone') e.vx=Math.cos(f*0.03+i)*2;
        if(e.kind==='boss'){if(e.x<50||e.x>W-50)e.vx*=-1;if(e.y>H*0.3)e.vy=0;if(e.sc!==undefined){e.sc-=sl;if(e.sc<=0){e.sc=40;pts.push({x:e.x,y:e.y+e.r,vx:(sx-e.x)*0.02,vy:5,life:60,ml:60,c:'#ff0044',s:6,boss:true});}}}
        if(e.y>H+40){ens.splice(i,1);continue;}
        if(Math.hypot(e.x-sx,e.y-sy)<e.r+18&&e.kind!=='boss'){
          if(S.sh){S.sh=false;boom(sx,sy,'#4488ff',10);ens.splice(i,1);}
          else{S.l--;setLives(S.l);shake(6,10);boom(sx,sy,'#ff4444',12);ens.splice(i,1);if(S.l<=0){S.go=true;setOver(true);sfxGameOver();}}
        }
      }

      for(let i=pts.length-1;i>=0;i--){
        const p=pts[i]; p.x+=p.vx*sl; p.y+=p.vy*sl; if(!p.boss)p.vy+=0.1; p.life--;
        if(p.boss&&Math.hypot(p.x-sx,p.y-sy)<20){if(S.sh)S.sh=false;else{S.l--;setLives(S.l);shake(4,8);if(S.l<=0){S.go=true;setOver(true);sfxGameOver();}}boom(sx,sy,'#ff4444',8);pts.splice(i,1);continue;}
        if(p.life<=0)pts.splice(i,1);
      }

      for(let i=pws.length-1;i>=0;i--){
        const p=pws[i]; p.y+=p.vy*sl; if(p.y>H+20){pws.splice(i,1);continue;}
        if(Math.hypot(p.x-sx,p.y-sy)<25){sfxCoin();if(p.t==='shield')S.sh=true;else if(p.t==='rapid')S.rf=f+300;else if(p.t==='bomb')S.bc++;else if(p.t==='slow')S.sl=f+200;else if(p.t==='x2')S.x2=f+400;pws.splice(i,1);}
      }

      stars.forEach(s=>{s.y+=s.sp*sl;if(s.y>H){s.y=-2;s.x=Math.random()*W;}});
    }

    function drw() {
      if(!ctx) return;
      const fc = S.fc;
      let ox=0,oy=0;
      if(S.su>fc){ox=(Math.random()-0.5)*S.sm*2;oy=(Math.random()-0.5)*S.sm*2;}
      ctx.save(); ctx.translate(ox,oy);

      // BG
      const bg=ctx.createLinearGradient(0,0,0,H);bg.addColorStop(0,'#0a0a1a');bg.addColorStop(0.5,'#0d0d2a');bg.addColorStop(1,'#1a0a2e');ctx.fillStyle=bg;ctx.fillRect(-10,-10,W+20,H+20);
      // Nebula
      const nr=300+Math.sin(fc*0.005)*50;
      const ng1=ctx.createRadialGradient(W*0.3,H*0.4,0,W*0.3,H*0.4,nr);ng1.addColorStop(0,'rgba(100,50,200,0.06)');ng1.addColorStop(1,'transparent');ctx.fillStyle=ng1;ctx.fillRect(0,0,W,H);
      if(S.sl>fc){ctx.fillStyle='rgba(60,100,255,0.08)';ctx.fillRect(0,0,W,H);}
      // Stars
      stars.forEach(s=>{ctx.fillStyle=`rgba(255,255,255,${s.b*(0.5+0.5*Math.sin(fc*0.02+s.x))})`;ctx.beginPath();ctx.arc(s.x,s.y,s.sz,0,6.28);ctx.fill();});
      // Comet trails
      ens.forEach(e=>{if(e.kind==='comet'&&e.trail)e.trail.forEach(t=>{ctx.fillStyle=`rgba(0,200,255,${t.a*0.3})`;ctx.beginPath();ctx.arc(t.x,t.y,3,0,6.28);ctx.fill();});});
      // Enemies
      ens.forEach(e=>{
        ctx.save();ctx.translate(e.x,e.y);ctx.rotate(e.rot);
        if(e.kind==='boss'){ctx.shadowColor='#ff0066';ctx.shadowBlur=20;const g=ctx.createRadialGradient(0,0,0,0,0,e.r);g.addColorStop(0,'#ff3366');g.addColorStop(1,'#660033');ctx.fillStyle=g;ctx.beginPath();ctx.arc(0,0,e.r,0,6.28);ctx.fill();ctx.shadowBlur=0;ctx.rotate(-e.rot);const bw=e.r*2;ctx.fillStyle='#333';ctx.fillRect(-bw/2,-e.r-15,bw,6);ctx.fillStyle=e.hp/e.mhp>0.3?'#00ff80':'#ff3333';ctx.fillRect(-bw/2,-e.r-15,bw*(e.hp/e.mhp),6);ctx.fillStyle='#ff0044';ctx.shadowColor='#ff0044';ctx.shadowBlur=10;ctx.beginPath();ctx.arc(-12,-5,5,0,6.28);ctx.arc(12,-5,5,0,6.28);ctx.fill();ctx.shadowBlur=0;}
        else if(e.kind==='comet'){ctx.shadowColor='#00ccff';ctx.shadowBlur=12;const g=ctx.createRadialGradient(0,0,0,0,0,e.r);g.addColorStop(0,'#88eeff');g.addColorStop(1,'#0066aa');ctx.fillStyle=g;ctx.beginPath();ctx.arc(0,0,e.r,0,6.28);ctx.fill();ctx.shadowBlur=0;}
        else if(e.kind==='drone'){ctx.strokeStyle='#aabb22';ctx.lineWidth=2;ctx.beginPath();ctx.arc(0,0,e.r+4,0,6.28);ctx.stroke();ctx.fillStyle='#889922';ctx.beginPath();ctx.arc(0,0,e.r,0,6.28);ctx.fill();}
        else{const g=ctx.createRadialGradient(-5,-5,0,0,0,e.r);g.addColorStop(0,'#888');g.addColorStop(1,'#444');ctx.fillStyle=g;ctx.beginPath();for(let a=0;a<8;a++){const an=6.28*a/8,r2=e.r*(0.8+0.2*Math.sin(a*3.7));if(a===0)ctx.moveTo(Math.cos(an)*r2,Math.sin(an)*r2);else ctx.lineTo(Math.cos(an)*r2,Math.sin(an)*r2);}ctx.closePath();ctx.fill();}
        if(e.kind!=='boss'){ctx.rotate(-e.rot);ctx.fillStyle='#fff';ctx.font=`bold ${Math.min(14,e.r*0.6)}px system-ui`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(e.text,0,0);}
        ctx.restore();
      });
      // Bullets
      bul.forEach(b=>{const g=ctx.createLinearGradient(b.x,b.y,b.x,b.y+12);g.addColorStop(0,S.rf>fc?'#ff8800':'#00ccff');g.addColorStop(1,'transparent');ctx.fillStyle=g;ctx.fillRect(b.x-2,b.y,4,12);});
      // Powerups
      const pc:Record<PwrType,string>={shield:'#4488ff',rapid:'#ff8800',bomb:'#ff4444',slow:'#8888ff',x2:'#ffcc00'};
      const pi:Record<PwrType,string>={shield:'S',rapid:'R',bomb:'B',slow:'T',x2:'2x'};
      pws.forEach(p=>{ctx.fillStyle=pc[p.t];ctx.shadowColor=pc[p.t];ctx.shadowBlur=10;ctx.beginPath();ctx.arc(p.x,p.y,12,0,6.28);ctx.fill();ctx.shadowBlur=0;ctx.fillStyle='#fff';ctx.font='bold 10px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(pi[p.t],p.x,p.y);});
      // Particles
      pts.forEach(p=>{ctx.globalAlpha=p.life/p.ml;ctx.fillStyle=p.c;ctx.beginPath();ctx.arc(p.x,p.y,p.s*(p.life/p.ml),0,6.28);ctx.fill();});ctx.globalAlpha=1;
      // Ship
      ctx.save();ctx.translate(sx,sy);
      for(let i=0;i<3;i++){ctx.fillStyle=`rgba(0,200,255,${0.3-i*0.1})`;ctx.beginPath();ctx.arc((Math.random()-0.5)*6,15+i*6,4+i*2,0,6.28);ctx.fill();}
      if(S.sh){ctx.strokeStyle='rgba(68,136,255,0.5)';ctx.lineWidth=2;ctx.beginPath();ctx.arc(0,0,24,0,6.28);ctx.stroke();}
      ctx.shadowColor='#00ccff';ctx.shadowBlur=15;ctx.fillStyle='#00ccff';ctx.beginPath();ctx.moveTo(0,-18);ctx.lineTo(-14,14);ctx.lineTo(-4,8);ctx.lineTo(0,12);ctx.lineTo(4,8);ctx.lineTo(14,14);ctx.closePath();ctx.fill();ctx.shadowBlur=0;
      ctx.fillStyle='#44eeff';ctx.beginPath();ctx.arc(0,-4,4,0,6.28);ctx.fill();ctx.restore();
      // HUD
      ctx.font='bold 16px system-ui';ctx.textAlign='left';ctx.fillStyle='rgba(255,255,255,0.8)';
      ctx.fillText(`SCORE ${S.s}`,12,24);ctx.fillText(`LVL ${S.lv}`,12,44);ctx.fillText(`HI ${S.hi}`,12,64);
      ctx.textAlign='right';ctx.fillText(Array.from({length:3},(_,i)=>i<S.l?'❤️':'🖤').join(''),W-12,24);
      if(S.co>=3){ctx.fillStyle='#ffcc00';ctx.font='bold 20px system-ui';ctx.textAlign='center';ctx.fillText(`${S.co}x COMBO!`,W/2,30);}
      const ind:string[]=[];if(S.sh)ind.push('🛡️');if(S.rf>fc)ind.push('🔥');if(S.sl>fc)ind.push('⏱️');if(S.x2>fc)ind.push('⭐');if(S.bc>0)ind.push(`💣×${S.bc}`);
      if(ind.length){ctx.font='14px system-ui';ctx.textAlign='right';ctx.fillStyle='rgba(255,255,255,0.7)';ctx.fillText(ind.join(' '),W-12,48);}
      ctx.restore();
    }

    let aid:number;
    function loop(){upd();drw();aid=requestAnimationFrame(loop);}
    aid=requestAnimationFrame(loop);
    return()=>{cancelAnimationFrame(aid);window.removeEventListener('keydown',kd);window.removeEventListener('keyup',ku);c.removeEventListener('mousemove',mm);c.removeEventListener('touchmove',tm);};
  },[g,gameId,over]);

  useEffect(()=>{const S=st.current;S.s=score;S.l=lives;S.lv=level;S.go=over;S.gt=gate;S.hi=hi;},[score,lives,level,over,gate,hi]);
  useEffect(()=>{if(over||gate)return;const cleanup=run();return cleanup;},[run,over,gate]);

  const ans=(o:string)=>{const S=st.current;if(o===gQ.answer){S.s+=50;S.lv++;setScore(S.s);setLevel(S.lv);sfxCorrect();sfxLevelUp();}else{S.l--;setLives(S.l);sfxWrong();if(S.l<=0){S.go=true;setOver(true);sfxGameOver();}}S.gt=false;setGate(false);};
  const restart=()=>{setScore(0);setLives(3);setLevel(1);setOver(false);setGate(false);const S=st.current;S.s=0;S.l=3;S.lv=1;S.go=false;S.gt=false;S.co=0;S.sh=false;S.rf=0;S.x2=0;S.sl=0;S.bc=0;S.fc=0;};

  return (
    <div className="game-card !p-0 overflow-hidden animate-pop-in" style={{border:'1px solid rgba(59,130,246,0.3)'}}>
      <div className="flex items-center justify-between p-3 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center gap-4">
          <span className="text-xs font-black text-blue-600">SCORE {score}</span>
          <span className="text-xs font-bold text-gray-400">LVL {level}</span>
          <span className="text-xs">{Array.from({length:3},(_,i)=>(i<lives?'❤️':'🖤')).join('')}</span>
          <span className="text-xs text-gray-400">HI {hi}</span>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-xs px-2 py-1 rounded hover:bg-gray-100 transition-all">✕ EXIT</button>
      </div>
      <div className="relative" style={{height:'420px'}}>
        {over&&(<div className="absolute inset-0 flex flex-col items-center justify-center z-20 bg-black/80 backdrop-blur-sm"><div className="text-6xl mb-4">💥</div><h3 className="text-3xl font-black text-white mb-2">Game Over!</h3><p className="text-4xl font-black text-blue-400 mb-1">{score} pts</p><p className="text-white/40 text-sm mb-6">Level {level} • Best {hi}</p><div className="flex gap-3"><button onClick={restart} className="btn-elite btn-elite-primary text-sm">Play Again</button><button onClick={onClose} className="btn-elite btn-elite-ghost text-sm">Exit</button></div></div>)}
        {gate&&!over&&(<div className="absolute inset-0 flex flex-col items-center justify-center z-20 p-6 bg-black/85 backdrop-blur-sm"><div className="text-4xl mb-2 animate-pop-in">🔒</div><h3 className="text-xl font-black text-white mb-1">KNOWLEDGE GATE</h3><p className="text-white/30 text-xs mb-6">Answer to keep flying!</p><p className="text-3xl font-black text-white mb-6">{gQ.text} = ?</p><div className="grid grid-cols-2 gap-3 w-full max-w-xs">{gQ.options.map((o,i)=>(<button key={i} onClick={()=>ans(o)} className="py-3 rounded-xl font-black text-white border border-white/20 hover:border-blue-400 bg-white/10 hover:bg-blue-600/20 transition-all active:scale-95">{o}</button>))}</div></div>)}
        <canvas ref={cvs} className="w-full h-full block" />
      </div>
      <div className="p-2 text-center text-gray-400 text-[10px] border-t border-gray-200">MOVE: Mouse/A-D/←→ • AUTO-FIRE • BOMB: B • Destroy enemies • Answer gates!</div>
    </div>
  );
}
