"""Core figures + tables from the verified analyses. All numbers come from the
frozen data and the verified pipeline; deterministic output."""
import numpy as np
import matplotlib; matplotlib.use('Agg'); import matplotlib.pyplot as plt
from datetime import datetime
from scipy import stats
from foundation import load_frozen, by_participant
import addropswap as ADS
import policies as P
import policies_v2 as P2
from cross_env import load_confirmatory, pooled_standardizer
from objective import ols_objective, bot_beliefs
from worker_model import run as wm_run

plt.rcParams.update({'pdf.fonttype':42,'ps.fonttype':42,'font.size':9.5,'font.family':'serif'})
META={"CreationDate":datetime(2024,1,1)}
TEAL='#1D9E75'; GREY='#888780'; BLUE='#4A7BA6'; ORANGE='#BA7517'; PLUM='#7A6FA6'; RED='#B5485D'

m=load_frozen('frozen_bundle_menu_data.csv','pilot_decisions_deployed.csv',strict=False)

# ============ FIGURE: pilot over-bundling headline ============
seen={}
for mm in m: seen.setdefault((mm.participant,mm.round),mm)
menus=list(seen.values())
opt_trip=np.mean([mm.oracle_size==1 for mm in menus])
bundle_rate=np.mean([1 if mm.chosen and mm.chosen.size>=2 else 0 for mm in menus if mm.chosen])
# bundling rate when optimum IS a trip vs IS a bundle
trip_menus=[mm for mm in menus if mm.oracle_size==1]; bun_menus=[mm for mm in menus if mm.oracle_size>=2]
br_trip=np.mean([1 if mm.chosen and mm.chosen.size>=2 else 0 for mm in trip_menus if mm.chosen])
br_bun=np.mean([1 if mm.chosen and mm.chosen.size>=2 else 0 for mm in bun_menus if mm.chosen])
fig,ax=plt.subplots(figsize=(5.2,3.6))
bars=ax.bar([0,1,2],[opt_trip,br_trip,br_bun],color=[GREY,RED,TEAL],width=0.62,edgecolor='white')
ax.set_xticks([0,1,2]); ax.set_xticklabels(['optimal move\nis a trip','participants bundle\nwhen optimum is a TRIP','participants bundle\nwhen optimum is a BUNDLE'],fontsize=8)
for i,v in enumerate([opt_trip,br_trip,br_bun]): ax.text(i,v+0.02,f'{v:.0%}',ha='center',fontweight='bold')
ax.set_ylim(0,1.05); ax.set_ylabel('share of menus'); ax.spines[['top','right']].set_visible(False)
ax.set_title('People bundle ~90% of the time whether or not bundling is correct',fontsize=10)
fig.tight_layout(); fig.savefig('fig_overbundle.pdf',metadata=META,bbox_inches='tight')

# ============ FIGURE: add/drop/swap mistake taxonomy ============
res,recs=ADS.summarize(m,verbose=False)
kinds=['over_inclusion','under_inclusion','wrong_composition','no_clean_onestep']
klab=['over-inclusion\n(drop an order)','under-inclusion\n(add an order)','wrong composition\n(swap)','no clean\none-step fix']
fig,ax=plt.subplots(figsize=(5.6,3.6))
for i,k in enumerate(kinds):
    pt,lo,hi=res['shares'][k]
    col=RED if k=='over_inclusion' else GREY
    ax.bar(i,pt,color=col,width=0.64,edgecolor='white')
    ax.errorbar(i,pt,yerr=[[pt-lo],[hi-pt]],color='#333',lw=1,capsize=3)
    ax.text(i,pt+0.015,f'{pt:.0%}',ha='center',fontweight='bold',fontsize=9)
ax.set_xticks(range(4)); ax.set_xticklabels(klab,fontsize=8)
ax.set_ylabel('share of suboptimal choices'); ax.spines[['top','right']].set_visible(False)
ax.set_title('The dominant mistake is over-inclusion (taking too big a bundle)',fontsize=10)
fig.tight_layout(); fig.savefig('fig_addropswap.pdf',metadata=META,bbox_inches='tight')

# ============ FIGURE: bot validation (temporal) ============
wm=wm_run(m,split_round=10,verbose=False)
acc=wm['metrics']['top1_acc']; base=wm['metrics']['random_baseline']
fig,ax=plt.subplots(figsize=(4.4,3.6))
ax.bar([0,1],[base,acc],color=[GREY,TEAL],width=0.55,edgecolor='white')
ax.set_xticks([0,1]); ax.set_xticklabels(['random\nchoice','bot prediction\n(fit r1-10, predict r11+)'],fontsize=8.5)
for i,v in enumerate([base,acc]): ax.text(i,v+0.015,f'{v:.0%}',ha='center',fontweight='bold')
ax.set_ylim(0,0.75); ax.set_ylabel('held-out top-1 accuracy'); ax.spines[['top','right']].set_visible(False)
ax.set_title('Bots predict later-round choices from early rounds',fontsize=10)
fig.tight_layout(); fig.savefig('fig_botvalidation.pdf',metadata=META,bbox_inches='tight')

# ============ FIGURE: five-policy dissociation (same-distribution, on pilot traps) ============
mu,sd=P.standardizer(m); mu0,pooled,a=P.fit_beliefs(m,mu,sd); Sig0=P.SIGMA0*np.eye(4)
seen2={}
for mm in m: seen2.setdefault(mm.scenario_id,mm)
traps=[mm for mm in seen2.values() if mm.oracle and max(mm.bundles,key=lambda b:b.payout).ids!=mm.oracle.ids and max(mm.bundles,key=lambda b:b.payout).size>mm.oracle.size]
rng=np.random.default_rng(42); rng.shuffle(traps); k=int(0.6*len(traps)); coach,transfer=traps[:k],traps[k:]
Wnu=P.future_relevance(transfer,mu,sd)
names=['no_feedback','scalar','oracle','current_loss','mct']; nlab=['no\nfeedback','scalar','oracle','current\n-loss','MCT']
ncol=[GREY,ORANGE,PLUM,BLUE,TEAL]
assist={}; trans={}
for nm in names:
    asd,tr=P.run_policy(nm,mu0,a,Sig0,coach,transfer,mu,sd,Wnu,0.3); assist[nm]=asd.mean(); trans[nm]=tr.mean()
fig,axes=plt.subplots(1,2,figsize=(8.4,3.5))
for ax,(dat,ttl) in zip(axes,[(assist,'Coaching block (assisted)'),(trans,'Transfer block (unaided)')]):
    for i,nm in enumerate(names):
        ax.bar(i,dat[nm],color=ncol[i],width=0.66,edgecolor='white')
    ax.set_xticks(range(5)); ax.set_xticklabels(nlab,fontsize=8); ax.set_title(ttl,fontsize=10)
    ax.set_ylabel('mean regret'); ax.spines[['top','right']].set_visible(False)
fig.suptitle('Oracle assistance corrects the current choice; only contrast teaching transfers',fontsize=10.5,y=1.02)
fig.tight_layout(); fig.savefig('fig_dissociation.pdf',metadata=META,bbox_inches='tight')

for f in ['fig_overbundle','fig_addropswap','fig_botvalidation','fig_dissociation']:
    import subprocess, shutil; shutil.which('pdftoppm') and subprocess.run(['pdftoppm','-png','-r','140',f'{f}.pdf',f'{f}_p'])
print('CORE FIGURES written')
print(f'  over-bundle: optimal-is-trip {opt_trip:.0%}, bundle-when-trip {br_trip:.0%}, bundle-when-bundle {br_bun:.0%}')
print('  add/drop/swap: over-inclusion %.0f%%' % (res['shares']['over_inclusion'][0]*100))
print(f'  bot validation: {acc:.0%} vs {base:.0%}')
print('  dissociation transfer: oracle %.3f, mct %.3f, scalar %.3f' % (trans['oracle'],trans['mct'],trans['scalar']))

# ============ TABLES ============
with open('tables.md','w') as f:
    f.write('## Table 1: Worker-model validation (temporal: fit rounds 1-10, predict 11+)\n\n')
    M=wm['metrics']
    f.write('| Quantity | Observed | Simulated | \n|---|---|---|\n')
    f.write('| Held-out top-1 accuracy | %.2f (chance) | %.2f |\n' % (M['random_baseline'],M['top1_acc']))
    f.write('| Mean regret | %.3f | %.3f |\n' % (M['obs_regret'],M['pred_regret']))
    f.write('| Mean bundle size | %.2f | %.2f |\n' % (M['obs_size'],M['pred_size']))
    f.write('| Optimal-choice rate | %.3f | %.3f |\n' % (M['obs_opt'],M['pred_opt']))
    f.write('\nShrinkage selected: %s. Held-out decisions: %d.\n\n' % (wm['shrinkage'],M['n']))
    f.write('## Table 2: Policy comparison (transfer-block regret on pilot trap menus, s2=0.3)\n\n')
    f.write('| Policy | Coaching regret | Transfer regret | vs no-feedback |\n|---|---|---|---|\n')
    base_tr=trans['no_feedback']
    for nm in names:
        delta='' if nm=='no_feedback' else f'{trans[nm]-base_tr:+.4f}'
        f.write('| %s | %.4f | %.4f | %s |\n' % (nm.replace('_',' '),assist[nm],trans[nm],delta))
    f.write('\nOracle: zero coaching regret (implemented) but poor transfer. MCT: best transfer.\n')
print('TABLES written to tables.md')
