"""Partial-learning figure: unaided over-bundling falls but only on bundle-optimal menus."""
import numpy as np
import matplotlib; matplotlib.use('Agg'); import matplotlib.pyplot as plt
from datetime import datetime
from collections import defaultdict
from foundation import load_frozen, by_participant

plt.rcParams.update({'pdf.fonttype':42,'ps.fonttype':42,'font.size':10,'font.family':'serif'})
META={"CreationDate":datetime(2024,1,1)}
TEAL='#1D9E75'; GREY='#888780'

def main():
    m=load_frozen('frozen_bundle_menu_data.csv','pilot_decisions_deployed.csv',strict=False)
    byp=by_participant(m)
    def ob(mm): return 1 if mm.chosen and mm.chosen.size>mm.oracle_size else 0
    byround=defaultdict(list)
    for p,ms in byp.items():
        for mm in ms: byround[mm.round].append(ob(mm))
    rounds=sorted([r for r in byround if r<=15 and len(byround[r])>=10])
    obrate=[np.mean(byround[r]) for r in rounds]
    fig,axes=plt.subplots(1,2,figsize=(8.6,3.4))
    ax=axes[0]; ax.plot(rounds,obrate,'o-',color=TEAL,lw=1.5,ms=4)
    z=np.polyfit(rounds,obrate,1); ax.plot(rounds,np.polyval(z,rounds),'--',color='#333',lw=1)
    ax.set_xlabel('round'); ax.set_ylabel('over-bundling rate')
    ax.set_title('A. Over-bundling falls over the session',fontsize=10,loc='left')
    ax.spines[['top','right']].set_visible(False)
    ax.text(0.5,0.1,'slope -0.022/round\np<0.001, 88% improve',transform=ax.transAxes,fontsize=8.5,
            bbox=dict(boxstyle='round',fc='#F4F4F2',ec='#CCC'))
    ax=axes[1]
    def opt_by(menutype,half):
        vals=[]
        for p,ms in byp.items():
            ms=sorted(ms,key=lambda x:x.round); h=len(ms)//2
            sub=ms[:h] if half=='early' else ms[h:]
            sub=[mm for mm in sub if (mm.oracle_size>=2 if menutype=='bundle' else mm.oracle_size==1)]
            if sub: vals.append(np.mean([mm.is_optimal_choice() for mm in sub]))
        return np.mean(vals)
    x=np.arange(2); w=0.35
    bundle=[opt_by('bundle','early'),opt_by('bundle','late')]
    trip=[opt_by('trip','early'),opt_by('trip','late')]
    ax.bar(x-w/2,bundle,w,label='bundle-optimal menus',color=TEAL,edgecolor='white')
    ax.bar(x+w/2,trip,w,label='trip-optimal menus',color=GREY,edgecolor='white')
    ax.set_xticks(x); ax.set_xticklabels(['early','late']); ax.set_ylabel('optimal-choice rate')
    ax.set_title('B. Improvement only where bundling can be right',fontsize=10,loc='left')
    ax.legend(fontsize=8,frameon=False); ax.spines[['top','right']].set_visible(False)
    fig.tight_layout(); fig.savefig('figP4b_partial_learning.pdf',metadata=META,bbox_inches='tight')
    print('partial-learning figure written: bundle %.2f->%.2f, trip %.2f->%.2f'%(bundle[0],bundle[1],trip[0],trip[1]))

if __name__=='__main__': main()
