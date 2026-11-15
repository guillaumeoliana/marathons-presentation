import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import races from './races';
import { names } from './monuments';
import { startScene, order, accents } from './scene';
import './style.css';

const phases=['Course','À visiter','Transport'];
const range=([a,b])=>a===b?a+' €':a+'–'+b+' €';
const chooseRide=(race,mode)=>mode==='bus'&&race.bus
  ? {label:'Bus',cost:race.bus,time:race.busTime}
  : {label:'Train',cost:race.train,time:race.time};

function costs(race, mode, nights) {
  const ride=chooseRide(race,mode);
  const stay=race.stay.map(n=>Math.round(n*nights/2));
  const meals=[25*(nights+1),40*(nights+1)];
  const total=race.bib.map((n,i)=>n+ride.cost[i]+stay[i]+meals[i]);
  return {ride,stay,meals,total};
}

function scrollToPosition(top) {
  const behavior=matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth';
  window.scrollTo({top,behavior});
}

function go(id) {
  const el=document.getElementById(id);
  scrollToPosition(el?el.getBoundingClientRect().top+window.scrollY+3:0);
}

function Travel({race, mode, nights, setMode, setNights, close}) {
  const {ride,stay,meals,total}=costs(race,mode,nights);
  return <article>
    <button className="close" aria-label="Fermer le carnet" onClick={close}>×</button>
    <p className="label">{race.country} / {race.date}</p>
    <h2 id="carnet-title">{race.name}</h2>
    <p>{race.profile} · 42,195 km</p>
    <div className="fields">
      <label>Transport depuis Paris<select value={mode} onChange={e=>setMode(e.target.value)}>
        <option value="bus">Bus si disponible</option><option value="train">Train</option>
      </select></label>
      <label>Durée du séjour<select value={nights} onChange={e=>setNights(Number(e.target.value))}>
        <option value="2">2 nuits</option><option value="3">3 nuits</option>
      </select></label>
    </div>
    <p className="total">{range(total)} <small>ESTIMATION PAR PERSONNE</small></p>
    <dl>{[
      ['Dossard',race.bib],[ride.label+' aller-retour',ride.cost],
      [nights+' nuits en chambre partagée à deux',stay],['Repas',meals]
    ].map(([label,cost])=><div key={label}><dt>{label}</dt><dd>{range(cost)}</dd></div>)}</dl>
    <p className="fine">Fourchettes indicatives. Transferts sur place et frais éventuels en supplément.</p>
    <h3>Le trajet</h3><p>{ride.time}. {race.plan}</p>
    <h3>À découvrir</h3><ul>{race.visits.map(place=><li key={place}>{place}</li>)}</ul>
    <h3>Avant de réserver</h3><p>{race.note}</p>
    <div className="links">
      <a href={race.source} target="_blank" rel="noreferrer">Site de la course ↗</a>
      <a href={ride.label==='Bus'?('https://www.flixbus.fr/'):race.transport.includes('flixbus')?'https://www.sncf-connect.com/':race.transport} target="_blank" rel="noreferrer">Rechercher un trajet ↗</a>
    </div>
  </article>;
}

function App() {
  const world=useRef(null), dialog=useRef(null);
  const [view,setView]=useState({index:0,reveal:0,intro:0,outro:0,fraction:0,slide:0,progress:0});
  const [menu,setMenu]=useState(false), [details,setDetails]=useState(null);
  const [mode,setMode]=useState('bus'), [nights,setNights]=useState(2);
  const race=races[order[view.index]];
  const {ride,total}=costs(race,mode,nights);
  const phase=view.fraction<.29?0:view.fraction<.57?1:2;
  const showHud=view.reveal>.7&&view.outro<.92;
  useEffect(()=>startScene(world.current,setView),[]);
  useEffect(()=>{
    if(details===null) {
      dialog.current.close();
      return;
    }
    const panel=dialog.current;
    panel.showModal();
    document.documentElement.classList.add('modal-open');
    return ()=>document.documentElement.classList.remove('modal-open');
  },[details]);
  useEffect(()=>{
    if(!menu) return;
    const escape=e=>{ if(e.key==='Escape')setMenu(false); };
    document.addEventListener('keydown',escape);
    return ()=>document.removeEventListener('keydown',escape);
  },[menu]);

  return <div className="app" style={{'--accent':accents[view.index]}}>
    <div className="sky" aria-hidden="true"/><div className="world" ref={world} aria-hidden="true"/>
    <div className="vignette" aria-hidden="true"/>
    <header>
      <a className="brand" href="#" onClick={e=>{e.preventDefault();setMenu(false);go();}}>42<span>.</span>195<small>COURIR AILLEURS</small></a>
      <span className="season">AU DÉPART DE PARIS / AVRIL–MAI 2027</span>
      <button aria-expanded={menu} aria-controls="escales" className="menu-button" onClick={()=>setMenu(v=>!v)}>{menu?'Fermer ×':'Les 10 escales ↗'}</button>
    </header>
    <nav id="escales" className="menu" hidden={!menu} aria-label="Choisir une escale">
      {order.map((id,i)=><button key={id} onClick={()=>{setMenu(false);go('city-'+i);}}>
        <small>{(i+1).toString().padStart(2,'0')}</small>{races[id].name}<span>{races[id].date}</span>
      </button>)}
    </nav>
    <main>
      <section className="intro" aria-labelledby="hero-title">
        <div className="intro-copy" inert={view.intro>.95} style={{opacity:1-view.intro,transform:'translateY('+(-75*view.intro)+'px)'}}>
          <p className="label">10 MARATHONS EN FRANCE ET EN EUROPE</p>
          <h1 id="hero-title">COUREZ<br/><em>AILLEURS.</em></h1>
          <p className="intro-detail">Les courses du printemps 2027,<br/>accessibles en train ou en bus depuis Paris.</p>
          <button className="underlined" onClick={()=>go('city-0')}>Entrer dans le voyage <span>↓</span></button>
        </div>
        <p className="coordinates" style={{opacity:1-view.intro}}>45°27′51″ N<br/>09°11′25″ E<br/><span>DUOMO DI MILANO</span></p>
        <div className="scroll-cue" style={{opacity:1-view.intro}}>DÉFILER POUR AVANCER <i/></div>
      </section>
      {order.map((id,i)=><section key={id} className="chapter" id={'city-'+i} data-chapter>
        <h2 className="sr-only">{races[id].name} · {races[id].date}</h2>
      </section>)}
      <section className="arrival" id="arrival">
        <p className="label">PRINTEMPS 2027</p><h2>ON PART<br/><em>OÙ ?</em></h2>
        <div className="arrival-index">{order.map((id,i)=><button key={id} onClick={()=>go('city-'+i)}>{races[id].name}<span>↗</span></button>)}</div>
        <p className="fine">Budgets indicatifs par personne, dossard, transport aller-retour, hébergement partagé et repas. Vérifie les dates et tarifs auprès des organisateurs avant de réserver.</p>
        <button className="underlined" onClick={()=>go()}>Revenir au départ <span>↑</span></button>
      </section>
    </main>
    <div className="hud" inert={!showHud} style={{opacity:view.reveal*(1-view.outro)}}>
      <div className="city" key={race.id} style={{opacity:1-view.slide*.8}}>
        <p className="label">ESCALE {String(view.index+1).padStart(2,'0')} / 10 <span>{race.country}</span></p>
        <h2>{race.name}</h2><p>{race.tag}</p>
      </div>
      <div className="pin pin-left" data-pin><span>LA COURSE</span><strong>{race.date}</strong><small>42,195 KM · {race.profile}</small></div>
      <div className="pin pin-right" data-pin><span>BUDGET DU WEEK-END</span><strong>{range(total)}</strong><small>{nights} NUITS · {ride.label.toUpperCase()} A/R · PAR PERSONNE</small></div>
      <div className="pin pin-right monument" data-pin><span>LE MONUMENT</span><strong>{names[race.id]}</strong></div>
      <aside className="story" key={race.id+'-'+phase} style={{opacity:1-view.slide*.78}}>
        <p className="label">{phases[phase].toUpperCase()}</p>
        <h3>{[race.profile,names[race.id],ride.time][phase]}</h3>
        <p>{[race.desc,race.visits.join(' · '),race.plan][phase]}</p>
        <button className="underlined" onClick={()=>setDetails(race.id)}>Carnet de voyage <span>↗</span></button>
      </aside>
      <div className="mobile-facts"><b>{race.date}</b><strong>{range(total)}</strong><small>{nights} nuits / pers.</small></div>
      <footer className="stage-bottom">
        <div className="phases">{phases.map((name,i)=><button key={name} aria-current={phase===i?'step':undefined} onClick={()=>{
          const el=document.getElementById('city-'+view.index);
          scrollToPosition(el.getBoundingClientRect().top+scrollY+el.offsetHeight*(i===0?.01:i===1?.32:.60));
        }}>{name}</button>)}</div>
        <button className="next" onClick={()=>go(view.index===9?'arrival':'city-'+(view.index+1))}>{view.index===9?'Les destinations':'Prochaine escale'} <span>↓</span></button>
      </footer>
    </div>
    <div className="progress" aria-hidden="true"><i style={{height:view.progress*100+'%'}}/></div>
    <dialog ref={dialog} aria-labelledby="carnet-title" onCancel={e=>{e.preventDefault();setDetails(null);}} onClick={e=>{if(e.target===dialog.current)setDetails(null);}}>
      {details!==null&&<Travel race={races[details]} {...{mode,nights,setMode,setNights}} close={()=>setDetails(null)}/>}
    </dialog>
  </div>;
}
createRoot(document.getElementById('root')).render(<App/>);
