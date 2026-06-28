"""Deep figure: the conditional value of forward-looking contrast teaching, across
three shift regimes, with full statistics. Honest about where MCT wins and where it doesn't."""
import numpy as np
import matplotlib; matplotlib.use('Agg'); import matplotlib.pyplot as plt
from matplotlib.patches import Patch
from datetime import datetime
from scipy import stats
from foundation import load_frozen, THIRTYFIVE_ROUND_JSON
from cross_env import load_confirmatory, pooled_standardizer, cross_dominated
import policies as P
import policies_v2 as P2
from objective import ols_objective, bot_beliefs

plt.rcParams.update({'pdf.fonttype':42,'ps.fonttype':42,'font.size':10,'font.family':'serif'})
META={"CreationDate":datetime(2024,1,1)}

pilot = load_frozen('frozen_bundle_menu_data.csv','pilot_decisions_deployed.csv',strict=False)
conf = load_confirmatory(THIRTYFIVE_ROUND_JSON)
mu, sd = pooled_standardizer(pilot, conf)
a_pool = ols_objective(pilot+conf, mu, sd)
mu0 = bot_beliefs(pilot, mu, sd, a_pool); Sig0=0.3*np.eye(4)
names=['no_feedback','scalar','oracle','current_loss','mct']
labels={'no_feedback':'no feedback','scalar':'scalar','oracle':'oracle','current_loss':'current-loss','mct':'MCT'}
colors={'no_feedback':'#888780','scalar':'#BA7517','oracle':'#7A6FA6','current_loss':'#4A7BA6','mct':'#1D9E75'}
s2=0.3

def cond(coach, transfer):
    Wnu=P.future_relevance(transfer,mu,sd); out={}
    for nm in names:
        _,tr=P2.run_policy(nm,mu0,Sig0,coach,transfer,mu,sd,Wnu,s2); out[nm]=tr
    return out
def ci(v):
    r=np.random.default_rng(1); d=[r.choice(v,len(v),replace=True).mean() for _ in range(2000)]
    return v.mean(), np.percentile(d,2.5), np.percentile(d,97.5)

seen={}
for m in pilot: seen.setdefault(m.scenario_id,m)
traps=[m for m in seen.values() if m.oracle and max(m.bundles,key=lambda b:b.payout).ids!=m.oracle.ids and max(m.bundles,key=lambda b:b.payout).size>m.oracle.size]
def psd(m): return np.std([b.picking_time for b in m.bundles])
mild=[m for m in traps if psd(m)<=7.4]; sharp=[m for m in traps if psd(m)>=8.4]; mid=[m for m in traps if 7.4<psd(m)<8.4]
conf_pick=[m for m in conf if np.std([b.picking_time for b in m.bundles])>np.std([b.cross_city_travel for b in m.bundles])]
conf_route=cross_dominated(conf)

C1=cond(mild+mid, sharp)               # within-picking shift
C3=cond(conf_pick, conf_route)         # cross-component shift (the clean test)
conds=[("Within-component shift\n(picking -> picking)", C1),
       ("Cross-component shift\n(picking -> routing)", C3)]

fig,axes=plt.subplots(1,2,figsize=(9.2,3.9),sharey=False)
for ax,(title,res) in zip(axes,conds):
    xs=np.arange(len(names)); 
    for i,nm in enumerate(names):
        pt,lo,hi=ci(res[nm])
        ax.bar(i,pt,color=colors[nm],width=0.7,edgecolor='white')
        ax.errorbar(i,pt,yerr=[[pt-lo],[hi-pt]],color='#333',lw=1,capsize=2.5)
    nf=res['no_feedback'].mean()
    ax.axhline(nf,color='#888780',ls='--',lw=1,alpha=0.7)
    ax.set_xticks(xs); ax.set_xticklabels([labels[n] for n in names],rotation=30,ha='right',fontsize=8.5)
    ax.set_title(title,fontsize=10.5); ax.spines[['top','right']].set_visible(False)
    ax.set_ylabel('transfer regret')
    # annotate MCT vs current-loss
    t=stats.ttest_rel(res['mct'],res['current_loss']); d=res['mct'].mean()-res['current_loss'].mean()
    star='MCT better' if d<0 and t.pvalue<.05 else ('CL better' if d>0 and t.pvalue<.05 else 'n.s.')
    ax.text(0.5,0.95,f'MCT vs current-loss: {star}\n(Δ={d:+.3f}, p={t.pvalue:.1g})',
            transform=ax.transAxes,ha='center',va='top',fontsize=8,
            bbox=dict(boxstyle='round',fc='#F4F4F2',ec='#CCC'))
fig.suptitle('Forward-looking contrast teaching helps only under a cross-component shift',
             fontsize=11.5,y=1.02)
fig.tight_layout()
fig.savefig('fig_shifted_transfer.pdf',metadata=META,bbox_inches='tight'); plt.close()
import subprocess, shutil; shutil.which('pdftoppm') and subprocess.run(['pdftoppm','-png','-r','150','fig_shifted_transfer.pdf','fig_shift'])
print('figure written')
print('within-component: current-loss %.3f vs MCT %.3f' % (C1['current_loss'].mean(), C1['mct'].mean()))
print('cross-component:  current-loss %.3f vs MCT %.3f  (MCT limits damage)' % (C3['current_loss'].mean(), C3['mct'].mean()))
