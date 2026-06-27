"""Picking-channel figure: teaching repairs the one component it targets (picking).
Numbers are produced by the faithful MCT policy re-verification (mechanism.py / policies.py)."""
import numpy as np
import matplotlib; matplotlib.use('Agg'); import matplotlib.pyplot as plt
from datetime import datetime
from foundation import load_frozen
import policies as P
from policies import xstd, single_move_contrasts, kalman, regret_of

plt.rcParams.update({'pdf.fonttype':42,'ps.fonttype':42,'font.size':9.5,'font.family':'serif'})
META={"CreationDate":datetime(2024,1,1)}
TEAL='#1D9E75'; GREY='#888780'

def main():
    m=load_frozen('frozen_bundle_menu_data.csv','pilot_decisions_deployed.csv',strict=False)
    mu,sd=P.standardizer(m); mu0,pooled,a=P.fit_beliefs(m,mu,sd); Sig0=P.SIGMA0*np.eye(4)
    seen={}
    for mm in m: seen.setdefault(mm.scenario_id,mm)
    traps=[mm for mm in seen.values() if mm.oracle and max(mm.bundles,key=lambda b:b.payout).ids!=mm.oracle.ids and max(mm.bundles,key=lambda b:b.payout).size>mm.oracle.size]
    rng=np.random.default_rng(42); rng.shuffle(traps); k=int(0.6*len(traps)); coach,transfer=traps[:k],traps[k:]
    Wnu=P.future_relevance(transfer,mu,sd)
    def final_beliefs(name):
        out={}
        for p,w0 in mu0.items():
            w=w0.copy(); Sig=Sig0.copy()
            for mm in coach:
                X=xstd(mm,mu,sd); ci=int(np.argmax(X@w))
                if name=='mct':
                    cand=single_move_contrasts(mm,ci)
                    if cand:
                        def Vval(j):
                            z=X[j]-X[ci]; Sz=Sig@z; return float(z@Sig@Wnu@Sz/(0.3+z@Sz))
                        best=max(cand,key=Vval); z=X[best]-X[ci]; w,Sig=kalman(w,Sig,z,z@a,0.3)
            out[p]=w
        return out
    nf=final_beliefs('no_feedback'); mct=final_beliefs('mct')
    def split_eval(beliefs):
        ro=[]; rother=[]; xp=[]
        for p,w in beliefs.items():
            for mm in transfer:
                X=xstd(mm,mu,sd); ci=int(np.argmax(X@w)); cb=mm.bundles[ci]; reg=regret_of(cb,mm)
                if cb.size>mm.oracle.size: ro.append(reg); xp.append(cb.picking_time-mm.oracle.picking_time)
                else: rother.append(reg)
        return np.mean(ro), np.mean(rother), np.mean(xp)
    nf_o,nf_ot,nf_xp=split_eval(nf); mct_o,mct_ot,mct_xp=split_eval(mct)
    fig,axes=plt.subplots(1,2,figsize=(8.2,3.4))
    ax=axes[0]; x=np.arange(2); w=0.35
    ax.bar(x-w/2,[nf_o,nf_ot],w,label='no feedback',color=GREY,edgecolor='white')
    ax.bar(x+w/2,[mct_o,mct_ot],w,label='MCT',color=TEAL,edgecolor='white')
    ax.set_xticks(x); ax.set_xticklabels(['over-bundling\n(picking) rounds','other rounds'])
    ax.set_ylabel('transfer-block regret'); ax.legend(fontsize=8,frameon=False)
    ax.set_title('A. Gain concentrates on picking rounds',fontsize=10,loc='left'); ax.spines[['top','right']].set_visible(False)
    ax=axes[1]; ax.bar([0,1],[nf_xp,mct_xp],color=[GREY,TEAL],width=0.55,edgecolor='white')
    ax.set_xticks([0,1]); ax.set_xticklabels(['no feedback','MCT']); ax.set_ylabel('excess picking time (s)')
    ax.set_title('B. Operates through reduced over-picking',fontsize=10,loc='left')
    for i,v in enumerate([nf_xp,mct_xp]): ax.text(i,v+0.4,f'{v:.0f}s',ha='center',fontweight='bold')
    ax.spines[['top','right']].set_visible(False)
    fig.suptitle('Teaching repairs the one component it targets: picking',fontsize=10.5,y=1.02)
    fig.tight_layout(); fig.savefig('fig_picking_channel.pdf',metadata=META,bbox_inches='tight')
    print('picking-channel figure: regret %.3f->%.3f, excess pick %.1f->%.1f'%(nf_o,mct_o,nf_xp,mct_xp))

if __name__=='__main__': main()
