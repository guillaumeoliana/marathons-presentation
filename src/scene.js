import * as T from 'three';
import { makeMonument } from './monuments';

export const order = [5,2,3,4,1,7,0,6,8,9];
export const accents = ['#f0bf93','#a3dbe2','#cae0a9','#eac994','#e5ae92','#ded1a2','#bbd5d9','#b6cea0','#c8bcf5','#a1d7e2'];
const clamp = (x,min=0,max=1) => Math.min(max,Math.max(min,x));
const ease = x => x*x*(3-2*x);

// The fallback projects the same meshes, using a depth-sorted software rasterizer.
function softwareRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  const ab = new T.Vector3(), ac = new T.Vector3(), normal = new T.Vector3();
  const light = new T.Vector3(-.6,1,1).normalize(), view = new T.Vector3();
  const lit = new Map();
  return {
    setSize(w,h) { canvas.width=w; canvas.height=h; },
    render(scene,camera) {
      const {width:w,height:h}=canvas;
      ctx.clearRect(0,0,w,h);
      scene.updateMatrixWorld();
      camera.updateMatrixWorld();
      const faces=[];
      scene.traverseVisible(object => {
        if(!object.isMesh) return;
        const positions=object.geometry.attributes.position, index=object.geometry.index;
        const world=[], projected=[];
        for(let i=0;i<positions.count;i++) {
          const p=new T.Vector3().fromBufferAttribute(positions,i).applyMatrix4(object.matrixWorld);
          world.push(p);
          projected.push(p.clone().project(camera));
        }
        const count=index?.count??positions.count;
        const base=object.material.color.getHexString();
        for(let j=0;j<count;j+=3) {
          const a=index?index.getX(j):j,b=index?index.getX(j+1):j+1,c=index?index.getX(j+2):j+2;
          normal.crossVectors(ab.subVectors(world[b],world[a]),ac.subVectors(world[c],world[a])).normalize();
          if (normal.dot(view.subVectors(camera.position,world[a]))<=0) continue;
          const p=projected[a],q=projected[b],r=projected[c];
          if (p.z < -1 || q.z < -1 || r.z < -1) continue;
          const shade=Math.round((.49+.51*Math.max(0,normal.dot(light)))*40);
          const key=base+':'+shade;
          if(!lit.has(key)) lit.set(key,'rgb('+[0,2,4].map(i=>Math.round(parseInt(base.slice(i,i+2),16)*shade/40)).join(',')+')');
          faces.push([p,q,r,p.z+q.z+r.z,lit.get(key)]);
        }
      });
      faces.sort((a,b)=>b[3]-a[3]);
      for(const [a,b,c,,color] of faces) {
        ctx.beginPath();
        ctx.moveTo((a.x+1)*w/2,(1-a.y)*h/2);
        ctx.lineTo((b.x+1)*w/2,(1-b.y)*h/2);
        ctx.lineTo((c.x+1)*w/2,(1-c.y)*h/2);
        ctx.closePath(); ctx.fillStyle=color; ctx.strokeStyle=color; ctx.lineWidth=.65;
        ctx.fill(); ctx.stroke();
      }
    },
    dispose(){},
  };
}

export function startScene(host, onChange) {
  let canvas = document.createElement('canvas');
  let renderer;
  let gpu=true;
  try {
    const context=canvas.getContext('webgl2',{alpha:true,antialias:true});
    if (!context) throw new Error('WebGL2 indisponible');
    renderer=new T.WebGLRenderer({canvas,context,alpha:true,antialias:true});
    renderer.setPixelRatio(Math.min(devicePixelRatio,1.6));
    renderer.toneMapping=T.ACESFilmicToneMapping;
    renderer.toneMappingExposure=1.35;
  } catch {
    gpu=false;
    canvas=document.createElement('canvas');
    renderer=softwareRenderer(canvas);
  }
  host.append(canvas);
  host.dataset.renderer=gpu?'webgl':'canvas';
  function useSoftware(event) {
    event?.preventDefault();
    canvas.removeEventListener('webglcontextlost',useSoftware);
    renderer.dispose();
    const replacement=document.createElement('canvas');
    canvas.replaceWith(replacement);
    canvas=replacement;
    gpu=false;
    renderer=softwareRenderer(canvas);
    host.dataset.renderer='canvas';
    invalidate();
  }
  canvas.addEventListener('webglcontextlost',useSoftware);

  const scene=new T.Scene();
  const camera=new T.PerspectiveCamera(36,1,.1,100);
  scene.add(new T.HemisphereLight('#e5efff','#33413e',2.35));
  const key=new T.DirectionalLight('#ffe0b7',2.7);
  key.position.set(-5,9,7); scene.add(key);
  const rim=new T.DirectionalLight('#94c6ff',2.1);
  rim.position.set(6,3,-6); scene.add(rim);

  const materials=new Map();
  const models=order.map(id=>makeMonument(id,materials));
  const display=new T.Group();
  scene.add(display);
  display.add(...models);
  const road=new T.Mesh(new T.TorusGeometry(6.7,.022,4,88),new T.MeshBasicMaterial({color:'#d7b48b'}));
  road.rotation.x=-Math.PI/2; road.position.y=-.72; display.add(road);
  const marker=new T.Mesh(new T.SphereGeometry(.09,8,8),new T.MeshBasicMaterial({color:'#ffebba'}));
  display.add(marker);

  const reduce=matchMedia('(prefers-reduced-motion: reduce)');
  const chapters=[...document.querySelectorAll('[data-chapter]')];
  const arrival=document.getElementById('arrival');
  const pins=[...document.querySelectorAll('[data-pin]')];
  const points=[new T.Vector3(-4.5,2.2,0),new T.Vector3(4.3,3.2,0),new T.Vector3(4.7,.1,1.1)];
  const projected=new T.Vector3();
  let w,h,starts,end;
  function resize() {
    w=host.clientWidth; h=host.clientHeight;
    renderer.setSize(w,h); camera.aspect=w/h; camera.updateProjectionMatrix();
    starts=chapters.map(node=>node.getBoundingClientRect().top+scrollY);
    end=arrival.getBoundingClientRect().top+scrollY;
  }

  let tickId, previous=0, y=scrollY, lastReport=-1, lastY=-1;
  function tick(t) {
    tickId=requestAnimationFrame(tick);
    if (document.hidden || (!gpu && t-previous<40)) return;
    const dt=Math.min(250,t-previous); previous=t;
    const target=scrollY;
    // Native smooth scrolling already supplies easing for navigation.
    y=!gpu||reduce.matches||Math.abs(target-y)<1?target:y+(target-y)*(1-Math.exp(-dt/65));
    if((!gpu||reduce.matches)&&y===lastY) return;
    lastY=y;
    let index=starts.findLastIndex(start=>y>=start);
    index=Math.max(0,index);
    const fraction=clamp((y-starts[index])/((starts[index+1]??end)-starts[index]));
    const slide=index<models.length-1?ease(clamp((fraction-.77)/.23)):0;
    const intro=ease(clamp((y-starts[0]*.28)/(starts[0]*.54)));
    const reveal=ease(clamp((y-starts[0]*.72)/(starts[0]*.22)));
    const outro=clamp((y-end+h*.23)/(h*.55));
    const mobile=w<720;
    const motion=reduce.matches?0:1;
    const orbit=motion*(.12*Math.sin((index+fraction)*1.6)+fraction*.12);
    const distance=mobile?Math.max(24,13*w/h+20):22.3-fraction*.9*motion;
    camera.position.set(distance*Math.sin(orbit),8.65+fraction*.9*motion,distance*Math.cos(orbit));
    camera.lookAt(mobile?0:-1.35,mobile?2.35:1.6,0);
    display.position.set(mobile?0:.7,mobile?.1:0,0);
    display.scale.setScalar(mobile ? Math.min(1,w/h*2.05) : 1);
    models.forEach((model,i)=>{
      model.visible=i===index||(slide>0&&i===index+1);
      if(!model.visible) return;
      const p=i===index?slide:slide-1;
      model.position.set(-p*16,-Math.sin(Math.abs(p)*Math.PI)*1.6,0);
      model.rotation.y=-.52+(i===index?fraction*.74:0)*motion+p*1.45*motion;
    });
    const raceAngle=motion*((gpu?t*.00035:0)+fraction*4);
    marker.position.set(6.7*Math.sin(raceAngle),-.69,6.7*Math.cos(raceAngle));
    try {
      renderer.render(scene,camera);
    } catch (error) {
      if(!gpu) throw error;
      useSoftware();
      return;
    }
    pins.forEach((el,i)=>{
      projected.copy(points[i]).add(display.position).project(camera);
      el.style.left=clamp((projected.x+1)*w*.5,205,w-218)+'px';
      el.style.top=clamp((1-projected.y)*h*.5,150,h-126)+'px';
      el.style.opacity=1-slide;
    });
    if(t-lastReport>32||!gpu||reduce.matches) {
      lastReport=t;
      const progress=clamp(y/(document.documentElement.scrollHeight-innerHeight));
      onChange({index,intro,outro,reveal,fraction,slide,progress});
    }
  }
  const invalidate=()=>{lastY=-1;resize()};
  resize(); tickId=requestAnimationFrame(tick);
  window.addEventListener('resize',invalidate);
  reduce.addEventListener('change',invalidate);
  return ()=>{
    cancelAnimationFrame(tickId);
    window.removeEventListener('resize',invalidate);
    reduce.removeEventListener('change',invalidate);
    scene.traverse(o=>o.geometry?.dispose());
    materials.forEach(m=>m.dispose());
    road.material.dispose(); marker.material.dispose();
    canvas.removeEventListener('webglcontextlost',useSoftware);
    renderer.dispose(); canvas.remove();
  };
}
