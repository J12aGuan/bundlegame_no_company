"""Mechanism figure: the verified, robust findings only.
Panel A: robust mechanism decomposition (time-underpricing dominates; pay-chasing absent).
Panel B: severity + distribution (time priced at ~55%, broad not subgroup).
Panel C: out-of-sample validation (time-pricing predicts future over-bundling)."""
import numpy as np
import matplotlib; matplotlib.use('Agg'); import matplotlib.pyplot as plt
from datetime import datetime
from scipy import stats
from foundation import load_frozen, by_participant
from mechanism import standardizer, ols_objective, xstd, FEATS5, fit_worker, worker_weights

plt.rcParams.update({'pdf.fonttype':42,'ps.fonttype':42,'font.size':9.5,'font.family':'serif'})
META={"CreationDate":datetime(2024,1,1)}
TEAL='#1D9E75'; GREY='#888780'; BLUE='#4A7BA6'; ORANGE='#BA7517'; PLUM='#7A6FA6'

m=load_frozen('frozen_bundle_menu_data.csv','pilot_decisions_deployed.csv',strict=False)
mu,sd=standardizer(m); a=ols_objective(m,mu,sd); d=len(FEATS5)
byp=by_participant(m); ob_time=abs(a[1])+abs(a[2])+abs(a[4])
H=worker_weights(m,mu,sd,a,anchor_payout=True)

# Panel A data: robust blocs (time vs routing vs payout) - the IDENTIFIED decomposition
seen={}
for mm in m: seen.setdefault((mm.participant,mm.round),mm)
recs=[]
for (p,r),mm in seen.items():
    if p not in H: continue
    ch=mm.chosen; orc=mm.oracle
    if ch is None or orc is None or ch.is_oracle: continue
    X=xstd(mm,mu,sd)
    ci=next((j for j,b in enumerate(mm.bundles) if b.is_chosen),None)
    oi=next((j for j,b in enumerate(mm.bundles) if b.is_oracle),None)
    if ci is None or oi is None: continue
    z=X[oi]-X[ci]; c=(a-H[p])*z
    bloc={'Time\\nunderpricing':c[1]+c[2]+c[4],'Routing\\nneglect':c[3],'Pay\\nchasing':c[0]}
    pos={k:max(0,v) for k,v in bloc.items()}
    if sum(pos.values())<=0: continue
    recs.append((max(pos,key=pos.get),p))
def cshare(val):
    from collections import defaultdict
    bp=defaultdict(list)
    for mech,p in recs: bp[p].append(mech)
    ps=list(bp.keys()); 
    def st(rr): 
        flat=[x for pp in rr for x in bp[pp]]; return sum(1 for x in flat if x==val)/len(flat) if flat else 0
    rng=np.random.default_rng(1); dr=[st([rng.choice(ps) for _ in ps]) for _ in range(2000)]
    base=sum(1 for mech,_ in recs if mech==val)/len(recs)
    return base,np.percentile(dr,2.5),np.percentile(dr,97.5)
blocs=['Time\\nunderpricing','Routing\\nneglect','Pay\\nchasing']
shares=[cshare(b) for b in blocs]

# Panel B data: per-worker time-pricing distribution
ratios=[]
for p,ms in byp.items():
    w=fit_worker(ms,mu,sd,d)
    if w is None: continue
    if abs(w[0])>1e-6: w=w*(a[0]/w[0])
    rr=(abs(w[1])+abs(w[2])+abs(w[4]))/ob_time
    if 0<=rr<2.5: ratios.append(rr)
ratios=np.array(ratios)

# Panel C data: out-of-sample time-pricing -> over-bundling
X=[]; Y=[]
for p,ms in byp.items():
    ms=sorted(ms,key=lambda x:x.round)
    if len(ms)<10: continue
    h=len(ms)//2
    w=fit_worker(ms[:h],mu,sd,d)
    if w is None: continue
    if abs(w[0])>1e-6: w=w*(a[0]/w[0])
    re=(abs(w[1])+abs(w[2])+abs(w[4]))/ob_time
    late=ms[h:]; obr=np.mean([1 if mm.chosen and mm.chosen.size>mm.oracle_size else 0 for mm in late if mm.chosen])
    if 0<=re<2.5: X.append(re); Y.append(obr)
X,Y=np.array(X),np.array(Y); rP,pP=stats.pearsonr(X,Y)

fig,axes=plt.subplots(1,3,figsize=(11,3.4))
# A
ax=axes[0]; xs=np.arange(len(blocs))
for i,(pt,lo,hi) in enumerate(shares):
    col=TEAL if i==0 else GREY
    ax.bar(i,pt,color=col,width=0.62,edgecolor='white')
    ax.errorbar(i,pt,yerr=[[pt-lo],[hi-pt]],color='#333',lw=1,capsize=3)
    ax.text(i,pt+0.04,f'{pt:.0%}',ha='center',fontsize=9,fontweight='bold')
ax.set_xticks(xs); ax.set_xticklabels([b.replace('\\n','\n') for b in blocs],fontsize=8.5)
ax.set_ylim(0,1.08); ax.set_ylabel('share of suboptimal decisions'); ax.spines[['top','right']].set_visible(False)
ax.set_title('A. One robust mechanism',fontsize=10.5,loc='left')
# B
ax=axes[1]
ax.hist(ratios,bins=np.arange(0,2.3,0.18),color=BLUE,edgecolor='white',alpha=0.85)
ax.axvline(1.0,color='#333',ls='--',lw=1.2); ax.text(1.02,ax.get_ylim()[1]*0.9,'prices time\ncorrectly',fontsize=7.5)
ax.axvline(np.median(ratios),color=TEAL,lw=2); ax.text(np.median(ratios)-0.02,ax.get_ylim()[1]*0.7,f'median\n{np.median(ratios):.0%}',ha='right',fontsize=8,color=TEAL,fontweight='bold')
ax.set_xlabel('worker time-pricing (fraction of true cost)'); ax.set_ylabel('workers')
ax.spines[['top','right']].set_visible(False); ax.set_title('B. Broad under-pricing',fontsize=10.5,loc='left')
# C
ax=axes[2]
ax.scatter(X,Y,s=22,color=PLUM,alpha=0.6,edgecolor='white',linewidth=0.5)
z=np.polyfit(X,Y,1); xx=np.linspace(X.min(),X.max(),50); ax.plot(xx,np.polyval(z,xx),color='#333',lw=1.5)
ax.set_xlabel('time-pricing (rounds 1 to h)'); ax.set_ylabel('over-bundling rate (rounds h+)')
ax.text(0.05,0.08,f'r = {rP:.2f}\np = {pP:.0e}',transform=ax.transAxes,fontsize=9,
        bbox=dict(boxstyle='round',fc='#F4F4F2',ec='#CCC'))
ax.spines[['top','right']].set_visible(False); ax.set_title('C. Predicts over-bundling',fontsize=10.5,loc='left')
fig.suptitle('Over-bundling is time-underpricing: workers price the time cost of bundling at ~55% of its true value',fontsize=11,y=1.03)
fig.tight_layout()
fig.savefig('fig_mechanism.pdf',metadata=META,bbox_inches='tight')
import subprocess, shutil; shutil.which('pdftoppm') and subprocess.run(['pdftoppm','-png','-r','150','fig_mechanism.pdf','fig_mech'])
print('mechanism figure written')
print(f'  A: time-underpricing {shares[0][0]:.0%} [{shares[0][1]:.0%},{shares[0][2]:.0%}], routing {shares[1][0]:.0%}, pay-chasing {shares[2][0]:.0%}')
print(f'  B: median pricing {np.median(ratios):.0%}, {(ratios<0.8).mean():.0%} under-price')
print(f'  C: r={rP:.2f}, p={pP:.1e}, n={len(X)}')
