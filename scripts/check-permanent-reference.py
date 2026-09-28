"""Independent dense NumPy FE equilibrium check of exported construction histories.
Uses closed-form Hermite bending/geometric matrices (not TS quadrature/band solver),
a separate active set and dense Newton solves. No production code is imported.
Run after check-permanent-reference.ts. NumPy only; no dependency changes required.
This is numerical cross-check evidence, not a geotechnical/model certification.
"""
import json
from pathlib import Path
import numpy as np
cases=json.loads(Path('output/pdf/permanent-reference-input.json').read_text())
summary=[]
for case in cases:
    previous=None; worst=0.; axial_error=0.
    for stage in case['stages']:
        mesh=np.array(stage['mesh']); n=len(mesh)*5; p=stage['section']; load=stage['load']; d=np.zeros(n) if previous is None else previous.copy()
        elems=[]
        for e,l in enumerate(np.diff(mesh)):
            B=p['EI']/l**3*np.array([[12,6*l,-12,6*l],[6*l,4*l*l,-6*l,2*l*l],[-12,-6*l,12,-6*l],[6*l,2*l*l,-6*l,4*l*l]])
            G=np.array([[36,3*l,-36,3*l],[3*l,4*l*l,-3*l,-l*l],[-36,-3*l,36,-3*l],[3*l,-l*l,-3*l,4*l*l]])/(30*l)
            ix=np.arange(5*e,5*e+10);z=np.array([1,2,6,7]);y=np.array([3,4,8,9]);elems.append((l,B,G,ix,z,y))
        def assemble(v):
            R=np.zeros(n);K=np.zeros((n,n));Ns=[]
            for l,B,G,ix,z,y in elems:
                a=v[ix]; g=np.zeros(10); g[0]=-1;g[5]=1
                gg=np.zeros((10,10));kb=np.zeros((10,10))
                for ids in [z,y]:
                    g[ids]=G@a[ids];gg[np.ix_(ids,ids)]=G;kb[np.ix_(ids,ids)]=B
                N=stage['N0']+p['EA']/l*(a[5]-a[0]+.5*(a[z]@G@a[z]+a[y]@G@a[y]));Ns.append(N)
                rr=kb@a+N*g;rr[z]+=p['q']*load['weightFactor']*np.array([l/2,l*l/12,l/2,-l*l/12])
                R[ix]+=rr;K[np.ix_(ix,ix)]+=kb+N*gg+p['EA']/l*np.outer(g,g)
            for sp in load['springs']:
                j=sp['node']*5+sp['axis'];delta=v[j]-sp['reference']
                if sp['sign'] and delta*sp['sign']<=0:continue
                pts=sp['curve']['points'];x=np.array([a['displacement'] for a in pts]);q=np.array([a['reaction'] for a in pts]);idx=min(len(x)-1,max(1,np.searchsorted(x,abs(delta))))
                k=(q[idx]-q[idx-1])/(x[idx]-x[idx-1]) if abs(delta)<x[-1] else 0
                factor=sp['factor']*sp['length'];R[j]+=np.sign(delta)*np.interp(abs(delta),x,q)*factor;K[j,j]+=k*factor
            R[1::5]+=load['loads']
            for j,f in load['forces']:R[j]-=f
            return R,K,np.array(Ns)
        active={o['id'] for o in load['obstacles'] if d[5*o['node']+1]<=o['height']+1e-8}
        for contact in range(200):
            fixed=dict(load['fixed']);fixed.update({5*o['node']+1:o['height'] for o in load['obstacles'] if o['id'] in active})
            for j,v in fixed.items():d[j]=v
            free=np.array([j for j in range(n) if j not in fixed]);scale=np.ones(n);scale[2::5]=mesh[-1];scale[4::5]=mesh[-1]
            for iteration in range(100):
                R,K,N=assemble(d);error=np.max(np.abs(R[free]/scale[free]))
                if error<1e-6:break
                A=K[np.ix_(free,free)];eq=1/np.sqrt(np.abs(np.diag(A)));step=eq*np.linalg.solve(A*eq[:,None]*eq[None,:],-R[free]*eq)
                for k in range(15):
                    trial=d.copy();trial[free]+=step*2**-k
                    if np.max(np.abs(assemble(trial)[0][free]/scale[free]))<error:d=trial;break
                else:raise RuntimeError('Reference Newton line search')
            else:raise RuntimeError('Reference Newton did not converge')
            R,K,N=assemble(d)
            bad=next((o for o in load['obstacles'] if o['id'] in active and R[5*o['node']+1]<-1e-6),None)
            if bad:active.remove(bad['id']);continue
            bad=next((o for o in load['obstacles'] if o['id'] not in active and d[5*o['node']+1]<o['height']-1e-7),None)
            if bad:active.add(bad['id']);continue
            break
        else:raise RuntimeError('Reference contact did not converge')
        expected=np.array(stage['expected']);err=np.max(np.abs(d-expected));worst=max(worst,float(err));axial_error=max(axial_error,float(np.max(np.abs(N-stage['axial']))))
        if err>1e-4 or np.max(np.abs(N-stage['axial']))>.02:raise RuntimeError(f"Mismatch {case['name']} {stage['name']}: {err}")
        previous=d
    summary.append({'case':case['name'],'states':len(case['stages']),'max_dof_error':worst,'max_axial_error_N':axial_error})
Path('output/pdf/permanent-reference-result.json').write_text(json.dumps(summary,indent=2));print(json.dumps(summary,indent=2))
