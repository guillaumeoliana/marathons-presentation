import * as T from 'three';

const stone = '#decbb2';
const slate = '#395666';
const gold = '#d3a665';
const ink = '#25333e';

export const names = ['Gare des Guillemins', 'Château de Cheverny', 'Palais de l’Île', 'Château des ducs de Bretagne', 'Château de Saumur', 'Duomo di Milano', 'Citadelle de Namur', 'Forteresse royale', 'Pont Adolphe', 'Notre-Dame de Royan'];

export function makeMonument(id, materials) {
  const group = new T.Group();
  function add(geometry, color, x, y, z) {
    if (!materials.has(color)) materials.set(color, new T.MeshStandardMaterial({color, roughness: .62}));
    const mesh = new T.Mesh(geometry, materials.get(color));
    mesh.position.set(x, y, z);
    group.add(mesh);
    return mesh;
  }
  const box = (x,y,z,w,h,d,c=stone) => add(new T.BoxGeometry(w,h,d),c,x,y,z);
  const cylinder = (x,y,z,r,h,c=stone,n=16) => add(new T.CylinderGeometry(r,r,h,n),c,x,y,z);
  const cone = (x,y,z,r,h,c=slate,n=8) => add(new T.ConeGeometry(r,h,n),c,x,y,z);
  const arch = (x,y,z,r,c=stone,t=.08) => add(new T.TorusGeometry(r,t,5,20,Math.PI),c,x,y,z);
  const slot = (x,y,z,w=.21,h=.54) => box(x,y,z,w,h,.07,ink);
  function tower(x,z,h,r,roof=true) {
    cylinder(x,h/2,z,r,h);
    slot(x,h*.72,z+r);
    if (roof) cone(x,h+.6,z,r*1.25,1.2);
    else for(let i=0;i<8;i++) {
      const a=i*Math.PI/4;
      box(x+Math.cos(a)*r*.85,h+.18,z+Math.sin(a)*r*.85,.24,.36,.24);
    }
  }
  function front(n,y,z,span=5) {
    for(let i=0;i<n;i++) slot(span*(i/(n-1)-.5),y,z);
  }

  const water = [2,8,9].includes(id);
  cylinder(0,-.37,0,5.7,.62,water?'#256274':'#344e48',48);
  cylinder(0,-.72,0,5.35,.12,gold,48);

  if(id===5) {
    box(0,.12,0,7.7,.24,4.4);
    box(0,1.58,0,6.15,2.9,3.6);
    box(0,3.08,-.05,2.55,1.05,3.6);
    for(let i=0;i<11;i++) {
      const x=(i-5)*.59, h=3.1+1.4*(1-Math.abs(x)/3.1);
      for(const z of [-1.81,1.81]) {
        box(x,h/2,z,.17,h,.3);
        cone(x,h+.35,z,.19,.85,stone,4);
      }
    }
    for(const x of [-2.35,-1.18,0,1.18,2.35]) {
      slot(x,1.05,1.84,.48,1.65);
      arch(x,1.9,1.94,.28,gold,.05);
      slot(x,2.58,1.85,.22,.66);
    }
    add(new T.TorusGeometry(.37,.075,6,20),gold,0,3.24,1.79);
    for(const x of [-3,3]) for(const z of [-1.45,-.68,.1,.88,1.53]) {
      box(x,1.7,z,.18,3.4,.17);
      cone(x,3.73,z,.17,.72,stone,4);
    }
    cylinder(0,4.1,0,.39,1.35);
    cone(0,5.08,0,.38,1.15,stone,6);
    cylinder(0,5.79,0,.075,.32,gold,8);
  } else if(id===2) {
    const plan = new T.Shape();
    plan.moveTo(-1.45,-1.5); plan.lineTo(1.45,-1.5); plan.lineTo(1.15,1.1);
    plan.lineTo(0,2.6); plan.lineTo(-1.15,1.1); plan.closePath();
    const walls = new T.ExtrudeGeometry(plan,{depth:1.65,bevelEnabled:false});
    walls.rotateX(-Math.PI/2);
    add(walls,stone,0,.03,0);
    const roof = cone(0,1.98,.45,2.04,.74,slate,4);
    roof.scale.z=1.12; roof.rotation.y=Math.PI/4;
    tower(0,-.95,2.05,.46);
    front(4,1,1.52,2.25);
    for(let i=0;i<5;i++) {
      const h=2.6+(i%3)*.65;
      cone(-3.8+i*1.9,h/2,-2.75,1.38,h,'#607986',4);
      cone(-3.8+i*1.9,h-.22,-2.75,.5,.6,'#d3ddde',4);
    }
    box(0,.08,2.3,1.15,.16,1.8,gold);
  } else if(id===0) {
    box(0,.13,0,7.1,.26,5,stone);
    for(let i=0;i<16;i++) {
      const ribs=arch(0,.35,-2.25+i*.3,3.4,'#dbe6e2',.042);
      ribs.scale.y=.61;
    }
    for(const x of [-2.2,-.7,.7,2.2]) box(x,.31,0,.075,.085,5.7,gold);
    box(0,.42,-1.4,4.7,.18,.7,'#5297a9');
  } else if(id===8) {
    for(const z of [-.54,.54]) {
      const a=arch(0,.15,z,2.85,stone,.24); a.scale.y=.84;
      for(const x of [-3.42,-2.77,-1.85,-1.15,1.15,1.85,2.77,3.42]){
        const h=2.55-.84*Math.sqrt(Math.max(0,2.85**2-x*x));
        box(x,2.62-h/2,z,.19,h,.28);
      }
    }
    box(0,2.81,0,7.8,.35,1.37);
    for(let x=-3.8;x<=3.8;x+=.31) box(x,3.15,.65,.055,.35,.055,gold);
    box(0,3.35,.65,7.8,.075,.075,gold);
    for(let i=0;i<6;i++) box(-3.5+i*1.3,.41,-2.7,.67,.82+(i%3)*.35,.72,'#708780');
  } else if(id===9) {
    box(-1,2.7,0,.75,5.4,.79,'#c7ccca');
    cone(-1,5.65,0,.56,.5,'#c7ccca',4);
    box(-1,6.08,0,.06,.53,.06,gold);
    box(-1,6.09,0,.36,.06,.06,gold);
    for(let i=0;i<15;i++) {
      const a=i*2*Math.PI/15;
      const wall=box(Math.cos(a)*1.87+.45,1.4,Math.sin(a)*1.64-.34,.43,2.8,.27,'#aab6b5');
      wall.rotation.y=-a;
    }
    cone(.45,3.08,-.34,2.02,.66,slate,16);
    for(let i=0;i<9;i++) box(-3.5+i*.84,.02,3.35,.62,.035,.035,'#afd2d3');
  } else if(id===6||id===7) {
    for(let i=0;i<3;i++) {
      const w=7-i*.9,z=-i*.73,y=i*.58;
      box(0,.3+y,z,w,.65,3.5-i*.45,'#a4ac9d');
      for(let x=-w/2+.25;x<w/2;x+=.53) box(x,.77+y,z+1.75-i*.225,.28,.35,.39);
    }
    tower(-2,-.45,id===7?4.1:3.05,.62,id===6);
    box(1.1,2,-1.2,2.38,2.5,1.5);
    front(4,2.67,-.43,1.7);
    if(id===6) cone(1.1,3.61,-1.2,1.6,.74,slate,4);
    else for(let x=.15;x<2.25;x+=.49) box(x,3.42,-.49,.24,.36,.4);
  } else {
    box(0,1.33,0,5.2,2.66,2.9);
    if(id===1) {
      for(const x of [-2.45,2.45]) {
        box(x,1.57,0,1.7,3.14,3.25);
        cone(x,3.72,0,2.08,1.16,slate,4).rotation.y=Math.PI/4;
        slot(x,2.61,1.65,.29,.72);
      }
      box(0,2.88,0,3.26,.47,2.85,slate);
      cone(0,3.44,0,1.05,.73,slate,4);
    } else if(id===4) {
      for(const x of [-2.52,2.52]) for(const z of [-1.43,1.43]) tower(x,z,3.45,.64);
      box(0,3.38,-.23,2.53,1.7,2.34);
      cone(0,4.86,-.23,1.8,1.3,slate,4);
    } else {
      for(const x of [-2.65,2.65]) for(const z of [-1.48,1.48]) tower(x,z,2.95,.68,false);
      box(0,2.75,-.45,3.31,1.43,1.9);
      cone(0,3.8,-.45,2.05,.84,slate,4);
    }
    front(7,1.98,1.48,4.2);
    front(7,.88,1.48,4.2);
    slot(0,.69,1.54,.5,1.35);
    arch(0,1.35,1.57,.28);
  }

  if (![0,2,8,9].includes(id)) for(let i=0;i<7;i++) {
    const a=i*2.399,x=Math.cos(a)*4.7,z=Math.sin(a)*4.7;
    box(x,.18,z,.12,.36,.12,'#756448');
    cone(x,.67,z,.36,.95,i%2?'#4b8876':'#6d9678',7);
  }
  return group;
}
