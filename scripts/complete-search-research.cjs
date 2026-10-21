// Reproducible normalization of the saved 2026-10-21 official-source audit.
// This does not scrape descriptions or infer merchants from arbitrary tier text.
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const {allTiers}=require('./integrate-search.cjs');
const tiers=allTiers(require('../validate-data.cjs').readData().cards);
const split=s=>s.split('|');
const group=(merchants,channel='direct',qualifier='')=>({merchants:typeof merchants==='string'?split(merchants):merchants,channels:[channel],qualifier});
const normalized=r=>{
  if(r.rules){r.merchants=[...new Set(r.rules.flatMap(g=>g.merchants))];r.channels=[...new Set(r.rules.flatMap(g=>g.channels))];}
  if(r.aliases)r.aliases=Object.fromEntries(Object.entries(r.aliases).filter(([n])=>r.merchants.includes(n)));
  return r;
};
function activate(r,rules,reason,gaps=[]){r.status='verified';r.rules=rules;r.reason=reason;if(gaps.length)r.gaps=gaps;return normalized(r);}
for(const name of ['esun','plans','miles-ctbc']){
  const file=path.join(root,'research','search-'+name+'.json'),rows=JSON.parse(fs.readFileSync(file,'utf8'));
  for(const r of rows){
    if(r.cardId==='unicard'&&r.scheme!=='基本回饋'){
      // Separate only groups whose complete specific-merchant restrictions were obtained.
      const special=split('Uber|Klook|Agoda|Booking.com|Hotels.com|Expedia|Trip.com|UNIQLO|NET|漢神百貨|特斯拉|日本實體一般消費');
      activate(r,[group(r.merchants.filter(n=>!special.includes(n)),'direct','須符合所選方案；以商家直接請款為準，百貨獨立櫃位除外'),
        group('Agoda|Booking.com|Hotels.com|Expedia|Trip.com','平台線上即時付款','限平台請款，不含飯店現場付款'),
        group('Uber|Klook','國內臺幣請款','限國內新臺幣交易'),
        group('UNIQLO|NET','臺灣街邊門市','不含百貨商場內門市'),
        group('UNIQLO|NET','臺灣官網','限品牌臺灣官網直接付款'),
        group('漢神百貨','physical','不含漢神巨蛋；須百貨本身請款'),
        group('特斯拉','官方充電資費','限官方充電，不代表購車回饋'),
        group('日本實體一般消費','physical','限日本實體一般消費直接刷卡，不含網購、第三方電子錢包及非一般消費；須帳單e化＋玉山臺幣帳戶成功自扣；任意選須選日本，4.5%須訂閱UP選')
      ],'已核官方百大名單，依訂房付款、國內臺幣與門市條件分組；未確認子範圍保留缺口。',[
        '行動支付、除日本外17國實體、Wallet公益捐款及台塑石油PAY特殊基本回饋尚未全部建模。'
      ]);
      r.source='https://event.esunbank.com.tw/credit/unicard/discount-channel.html';
      r.checkedAt='2026-10-22';
    }
    if(r.cardId==='ubear'&&r.label==='網路消費／行動支付加碼'){
      const special=split('Agoda|Booking.com|Google Play|全電商');
      activate(r,[group(r.merchants.filter(n=>!special.includes(n)),'online','限線上直接刷卡；需帳單e化與玉山自扣'),group('Agoda|Booking.com','平台線上即時付款','不含延後扣款或到店付款'),group('Google Play','online','限Google Play，不含Google One／Services'),group('全電商','online','排除全支付及PX Pay')],
        '官方列舉網購通路依請款方式拆分；不以品牌推定實體刷卡適用。',['指定行動支付的逐服務條件尚未全部建模。']);
    }
    if(r.cardId==='kumamon'&&r.label==='日本 PayPay 現金回饋（另免海外手續費）'){
      activate(r,[group('玉山Wallet日本PayPay','玉山Wallet日本PayPay','限玉山Wallet可受理交易；不含網購及PayPay Money Only')],'以限定付款服務搜尋，不將PayPay合作店名全部當成適用名單。');
    }
    if(r.cardId==='kumamon'&&['名古屋指定實體加碼','九州JR博多City／AMU PLAZA'].includes(r.label)){
      r.searchType='perk';activate(r,[group(r.merchants,'日本實體（日圓）','額外加碼，非總回饋率；須登錄及達活動門檻')],'官方完整具名清單，活動額外回饋獨立列於權益，不混入總率排名。');
    }
    if(r.cardId==='dawho'&&r.queryScenarios)r.qualifier='海外需非臺灣國別且外幣；各資產／任務條件仍須符合';
    if(r.cardId==='richart'&&r.label==='網購／影音／AI／遊戲訂閱')activate(r,[group(r.merchants,'direct','須切數趣刷／LEVEL2；不含儲值、票券、貴金屬、廣告及代繳；蝦皮限臺灣臺幣')],'完整數趣刷具名名單；僅原平台直接付款並保留商品排除。');
    if(r.cardId==='richart'&&r.label==='Chill刷：數位外掛')activate(r,[group(r.merchants,'direct','須切Chill刷／LEVEL2；限品牌獨立店、官網或指定平台，非任意經銷商')],'官方具名品牌及平台名單已核；不將品牌延伸到未指定經銷商。');
    if(r.cardId==='richart'&&['瘋聚會／日常續命','約會犒賞／應援追星／熬夜追更'].includes(r.label))activate(r,[group(r.merchants,'指定獨立店／官網','須切Chill刷／LEVEL2；排除百貨、商場、飯店及非指定平台')],'完整Chill具名清單；只在指定獨立店／官網交易類別顯示。');
    if(r.cardId==='cube'&&r.label==='指定網購／影音／AI工具')activate(r,[group(r.merchants,'direct','須切玩數位／LEVEL2；酷澎限臺灣，排除儲值、票券及非指定硬體')],'官方玩數位具名名單與服務限制已核；訂閱以原平台直接扣款為限。');
    if(r.cardId==='cube'&&r.label==='秋日遊：國內指定日系飯店')activate(r,[group(r.merchants,'飯店直接住宿付款','限臺灣飯店本身請款的住宿；不含代訂平台')],'五家官方飯店，取共同明確適用的直接住宿交易；不涵蓋餐飲子範圍。',['除礁溪寒沐外飯店餐飲等非住宿消費尚未建模。']);
    if(r.cardId==='cube'&&r.label==='一般消費（不含保費）')activate(r,[group('國內一般消費','direct','切入固定回饋後有鎖定；不含保費'),group('國外一般消費','海外線上一般消費','海外實體另層，不混用')],'一般消費查詢與海外實體分流。');
    if(r.cardId==='ctbc-ci'&&r.label.includes('eMall')){
      const booking=split('Agoda|Hotels.com|Expedia|Trip.com|Booking.com|Airbnb');
      activate(r,[group(r.merchants.filter(n=>!booking.includes(n)),'direct','限官網購票或指定免稅／eMall，不含第三方支付'),group(booking,'海外住宿（國外請款）','限國外住宿，且帳單有國外交易手續費')],'指定航空及六家住宿平台已核，按請款交易條件分組。',['海外實體一般消費類別尚未另建。']);
    }
    if(r.cardId==='esun-starlux'&&r.label==='星宇指定通路2倍（國內適用消費）')activate(r,[group(r.merchants,'國內臺幣請款','限國內認列；不含購買哩程、第三方支付，須繳全額年費')],'四指定通路完整核對，限定本層國內認列條件。');
    if(r.cardId==='richart'&&r.label==='海外消費／航空（15家）／訂房／旅行社（13家）／日韓交通卡'){
      const platforms=split('Klook|KKday|Agoda|Booking.com|Trip.com|Airbnb|Hotels.com|Expedia'),stored=split('Suica|ICOCA|PASMO|WOWPASS');
      const special=['國外一般消費','Uber','Grab','AIRSIM',...platforms,...stored];
      activate(r,[group(r.merchants.filter(n=>!special.includes(n)),'direct','切玩旅刷／LEVEL2；航空限直接購票，旅行社限直營'),group(platforms,'平台線上即時付款','平台實際扣款，不含到店付款'),group(stored,'官方交通卡儲值','限指定交通卡儲值，不代表一般消費'),group('Uber|Grab','海外搭車','限國外叫車'),group('AIRSIM','online','限VISA／Mastercard'),group('國外一般消費','direct','切玩旅刷／LEVEL2，須為銀行認列海外交易')],'官方完整航空、訂房、旅行社及交通服務清單，依交易方式拆分。');
    }
    if(r.cardId==='richart'&&r.label==='百貨／時尚品牌')activate(r,[group(r.merchants,'臺灣指定門市／官網','切大筆刷／LEVEL2；排除新光站前、百貨店中店與誠品書店；時尚品牌限臺灣')],'完整指定百貨館別與時尚品牌，按臺灣指定門市／官網條件顯示。');
    if(r.cardId==='richart'&&r.label==='超商／超市／量販／加油／停車'){
      const special=split('全家|7-ELEVEN|智生活|USPACE|Uber|台灣Bolt|寶雅|康是美|屈臣氏|杏一醫療|大樹藥局|丁丁藥局|佑全保健藥妝|健康人生藥局');
      activate(r,[group(r.merchants.filter(n=>!special.includes(n)),'臺灣直接付款','切天天刷／LEVEL2；限指定服務直接請款'),group('全家|7-ELEVEN','台新Pay','切天天刷／LEVEL2；不是一般直接刷卡'),group('智生活','到府服務','不含社區管理費'),group('USPACE','停車','限停車費'),group('Uber|台灣Bolt','國內臺幣請款','限臺灣搭車'),group('寶雅|康是美|屈臣氏|杏一醫療|大樹藥局|丁丁藥局|佑全保健藥妝|健康人生藥局','指定獨立店／官網','排除藥品、奶粉、醫材；指定排除門市不適用')],'逐服務拆分；藥妝分店例外仍有缺口。',['藥妝完整排除門市尚未結構化，不以所有分店適用宣稱完整。']);
      // Until branch exclusions are encoded, do not rank those eight brands.
      const omitted=r.rules.pop();r.gaps.push('未啟用：'+omitted.merchants.join('、'));normalized(r);
    }
    if(r.cardId==='richart'&&r.label==='餐飲／KTV／娛樂'){
      const digital=split('Uber Eats|foodpanda|拓元售票|KKTIX|年代售票|寬宏售票|OPENTIX|FunNow'),ktv=split('錢櫃|好樂迪|ONCOR|sing!go|享溫馨');
      activate(r,[group('王品瘋Pay','王品瘋Pay','切好饗刷／LEVEL2'),group(digital,'國內臺幣請款','切好饗刷／LEVEL2；原平台付款'),group(ktv,'physical','限KTV直接請款'),group(r.merchants.filter(n=>!['王品瘋Pay',...digital,...ktv].includes(n)),'飯店直接付款','指定飯店本身請款，不含票券或代訂')],'已列完整具名飯店及娛樂服務；餐飲MCC不泛配任意餐廳。',['一般餐飲MCC類別尚未提供獨立搜尋，避免由品牌推定交易代碼。']);
    }
    if(r.cardId==='richart'&&r.label==='LINE Pay／全盈+PAY（Pay著刷）')activate(r,[group('LINE Pay','LINE Pay','切Pay著刷／LEVEL2；限臺灣臺幣，排除四大超商、稅費'),group('全盈+PAY','全盈+PAY','切Pay著刷／LEVEL2；限臺灣臺幣，排除四大超商、稅費')],'以支付服務查詢，不將合作店名視為直接刷卡通路。');
    if(r.cardId==='richart'&&r.label==='保費消費')activate(r,[group('國內保費','直接一次付清保費','限境內保單；排除躉繳、投資型、彈性繳、海外及分期；交易及入帳均須在期間內')],'保費服務查詢，不按保險品牌推定所有商品。');
    if(r.cardId==='cube'&&r.label==='秋日遊：日本實體消費／指定交通卡'){
      activate(r,[group(r.merchants.filter(n=>!['Suica','PASMO','ICOCA','GO Taxi'].includes(n)),'日本實體（日圓）','切秋日遊；限日本實體，不含臺灣同名店或網購'),group('Suica|PASMO|ICOCA','Apple Pay','限Apple錢包交通卡儲值'),group('GO Taxi','日本叫車','限日本GO Taxi服務')],'日本實體、交通卡與GO Taxi分組。');
    }
    if(r.cardId==='cube'&&r.label==='秋日遊：日本指定品牌／餐廳預約平台'){
      const platform=split('Tabelog|TableCheck|OMAKASE'),unknown=split('KIDDY LAND OMO KADO店|KIDDY LAND橫濱店');
      activate(r,[group(r.merchants.filter(n=>![...platform,...unknown].includes(n)),'日本指定實體門市','切秋日遊；限列名門市，須符合官方請款名稱'),group(platform,'平台線上即時付款','只計平台實際扣款，不含現場餐費')],'按指定日本實體門市與預約平台付款拆分。',['KIDDY LAND最後兩家名稱原文標點不明，尚未啟用。']);
    }
    if(r.cardId==='cube'&&r.label==='全聯／大全聯／全支付國內合作通路')activate(r,[group('全聯福利中心|大全聯|全支付','全支付','須切全支付方案；限國內合格消費，不含繳費、跨境、儲值、捐款、菸酒、奶粉及禮券')],'以銀行明列兩店與支付服務查詢；不推定全聯直接刷卡適用。',['全支付其他合作店的逐店別名尚未建立；可用全支付服務查詢。']);
    if(r.cardId==='cube'&&r.label==='指定充電／停車／超商／量販／加油'){
      activate(r,[group('U-POWER|EVOASIS|EVALUE|TAIL|iCharging','官方充電資費','切集精選／LEVEL2；不含購車'),group('車麻吉|uTagGo','停車','車麻吉不含加油充電；uTagGo不含月租'),group('萬家福|樂家康|LOPIA|全聯福利中心|中油直營|7-ELEVEN|全家|IKEA','臺灣實體直接刷卡','切集精選／LEVEL2；全聯不含大全聯，LOPIA限臺灣')],'指定充電、停車服務及國內實體名單已分組。');
    }
    if(r.cardId==='cube'&&r.label==='慶生月：新光三越／Uber Eats／Klook')activate(r,[group('新光三越','physical','正卡生日月切慶生月；不含SKM Park及獨立店中櫃'),group('Uber Eats|Klook','平台線上即時付款','正卡生日月切慶生月；限平台實際扣款')],'生日資格沿用原tier；百貨與平台交易分開。');
    if(r.cardId==='cube'&&r.label==='台塑家指定加油／品牌／超商')activate(r,[group('台塑石油加油站|台亞加油站|福懋加油站|統一速邁樂','指定實體加油站','切台塑家；速邁樂限本島，不含一般電子支付'),group('台塑生醫|長庚生技|台塑蔬菜|7-ELEVEN|全家|萊爾富','臺灣實體直接刷卡','切台塑家；限指定品牌實體消費'),group('台塑購物網','online','切台塑家；限指定網站直接付款')],'加油、品牌實體及購物網分組，不泛配支付。');
    if(r.cardId==='ubear'&&r.label==='新卡友指定三大通路加碼'){
      r.searchType='perk';activate(r,[group(r.merchants,'online','額外加碼非總率；首次申辦且核卡後60天，Apple／Google須符合指定請款名稱')],'官方完整三類新卡友名單；額外加碼不當總回饋排名。');
    }
    if(r.cardId==='ubear'&&r.label==='玉山新戶一般消費加碼'){
      r.searchType='perk';activate(r,[group(r.merchants,'direct','額外加碼非總率；限核卡當月及次月，非所有新戶都適用至活動最晚截止')],'個人核卡窗口以必要資格顯示，不將全活動期限誤當個人權益期間。');
    }
    if(r.cardId==='pi'&&r.label==='Pi 拍錢包合作通路一般消費')activate(r,[group('Pi拍錢包合作通路','Pi拍錢包','單筆499元、登錄、e化及自扣；排除商品可能使整筆不回饋')],'提供限定付款服務查詢，不將「可折抵」店家當成可賺取回饋。',['各合作店及排除商品尚無可保證完整的具名對照，300 P幣含基本與否仍未明。']);
    if(r.cardId==='kumamon'&&r.label==='日本指定商店加碼（+6%）'){
      const stored=['Suica','PASMO','ICOCA'];
      activate(r,[group(stored,'日本交通卡日幣儲值','須符合熊本熊指定通路及日幣認列'),group('樂天旅遊','日本日文官網（日圓）','限日文版直接付款，非其他地區網站'),group(r.merchants.filter(n=>![...stored,'樂天旅遊'].includes(n)),'日本日圓直接付款','限日本日圓指定通路請款；不含PayPay或百貨代收')],'完整五類具名名單，限制日本日圓直接交易及樂天日文版，不泛配全球品牌。');
    }
    if(r.cardId==='richart'&&r.label==='LINE Pay：Pay著刷＋十月券')activate(r,[group('LINE Pay','LINE Pay','須十月領券、Pay著刷／LEVEL2及臺灣臺幣；排除四大超商／稅費')],'只提供支付服務查詢；期限沿用十月，不因Q4標題延長。');
    if(r.cardId==='cube'&&r.label==='海外實體／航空／訂房／旅行社'){
      const stored=split('Suica|PASMO|ICOCA'),rides=split('Uber|Grab|台灣高鐵|yoxi|台灣大車隊|iRent|和運租車|格上租車'),hotels=split('星野集團|全球迪士尼飯店|東橫INN'),platforms=split('KKday|Klook|Agoda|Airbnb|Booking.com|Trip.com'),parks=split('東京迪士尼樂園|東京華納兄弟哈利波特影城|大阪環球影城');
      const special=[...stored,...rides,...hotels,...platforms,...parks];
      activate(r,[group(r.merchants.filter(n=>!special.includes(n)),'官方直接購票／服務','切趣旅行／LEVEL2；航空機票與直營旅行社'),group(stored,'Apple Pay','限Apple錢包交通卡儲值'),group(rides,'短程交通／租車','不含機場接送、長租或代駕'),group(hotels,'飯店直接住宿付款','限住宿MCC，不含餐廳／平台'),group(platforms,'平台線上即時付款','限平台請款，不含到店付款'),group(parks,'官方直接購票／服務','限指定樂園官網／現場，不含代售')],'趣旅行指定品牌按交通、航空、住宿與平台方式分組。',['未另建立海外一般實體MCC類別查詢。']);
    }
    if(r.cardId==='cube'&&r.label==='指定五感課程／嬰幼童品牌臺灣官網'){
      const baby=split('10mois|Mamas&Papas|古北町|Little Wonders|Seahorse Originals');
      activate(r,[group(baby,'臺灣官網','童樂匯資格；不含奶粉／藥品'),group(r.merchants.filter(n=>!baby.includes(n)),'指定教學課程','不含教材、展演、場租；Yamaha限臺灣直營與揚昇石牌')],'童樂匯課程與嬰童臺灣官網分組；終止商家不收錄。');
    }
    if(r.cardId==='cube'&&r.label==='指定私校i繳費／國內保費')activate(r,[group(r.merchants.filter(n=>n!=='台北歐洲學校'),'i繳費學費','童樂匯資格；限指定私校學費'),group('台北歐洲學校','家長入口轉i繳費','須TES家長入口跳轉')],'私校支付路徑明確分開；不以學校名稱匹配其他消費。',['同層國內保費的特定保單排除尚未建立完整服務規則。']);
    if(r.cardId==='cathay-eva'&&r.label==='長榮官網/App／機上免稅／海外實體及指定線上住宿'){
      const lodging=split('Agoda|Airbnb|Hotels.com|Expedia|Booking.com|Trip.com|AsiaYo');
      activate(r,[group('長榮航空官網/App購票|長榮航空機上免稅品','direct','不含免稅品預購'),group(lodging,'海外住宿（國外請款）','須海外請款住宿，不含30天以上長租'),group('KKday|Klook','海外住宿（外幣請款）','須海外住宿且外幣請款')],'先涵蓋原tier標籤明確列示的航空與海外住宿，不借用10元/哩套其他新增服務。',['海外餐飲、交通卡、交通、航空與娛樂等新增類別需要獨立tier及MCC條件；尚未整合。']);
    }
    if(r.cardId==='cathay-eva'&&r.label==='旅行社長榮機票／國外自由行／團體旅遊（登錄）')activate(r,[group('旅行社長榮機票／旅遊登錄','指定長榮航程','限本人搭乘、單筆指定機票／團費，搭後5–180日成功登錄')],'限定航程登錄服務查詢，不映射任意旅行社所有商品。');
  }
  for(const r of rows)if(r.cardId==='fubon-j'&&r.label==='日韓泰實體 ＋3%（需登錄）')r.qualifier='限當地實體面對面消費，單筆滿新臺幣1,000元並完成當季登錄；須符合基本3%任務，儲值不適用';
  fs.writeFileSync(file,JSON.stringify(rows.map(normalized),null,2)+'\n');
}

const ids=['linebank','breeze','mcard','jihe','green','dbs-aov','dbs-eco'];
const rows=tiers.filter(x=>ids.includes(x.c.id)).map(({c,t,scheme})=>({cardId:c.id,scheme,label:t.label,status:'unresolved',reason:'尚未完成本層官方交易名單與排除條件查證，暫不推薦。',merchants:[],aliases:{},source:t.source,end:t.end,channels:['direct'],searchType:/元\/哩$/.test(t.rate)?'mile':/^\d+(\.\d+)?$/.test(t.rate)?'cash':'perk'}));
function set(id,label,groups,reason,gaps=[]){const r=rows.find(x=>x.cardId===id&&x.label===label);if(!r)throw Error(id+'/'+label);r.checkedAt='2026-10-21';return activate(r,groups,reason,gaps);}
const general=['國內一般消費','國外一般消費'];
for(const id of ids){
  const basics=rows.filter(r=>r.cardId===id&&/^(國內外一般消費（基本）|國內一般消費|國內一般消費（基本）|國外一般消費|海外一般消費（含非實體）)$/.test(r.label));
  for(const r of basics)set(id,r.label,[group(r.label.startsWith('國內外')?general:r.label.startsWith('國內')?general.slice(0,1):general.slice(1),'direct','僅合格一般消費；不含分期及銀行排除項目，仍須達卡片任務')],'官方一般消費類別；不自動匹配任意商家。',r.cardId==='green'?['國外2%未建立獨立tier，未以國內1%代替。']:[]);
}
set('linebank','指定通路：國內4%／國外5.5%',[group('momo|PChome|淘寶|蝦皮|酷澎|Netflix|Disney+|CatchPlay|Spotify|LINE TV|KKTV|KKBOX|Steam|PlayStation|Nintendo|Blizzard|Garena|MyCard|拓元售票|KKTIX','direct','限指定平台直接請款；雙幣別以較低比例排序')],'官方20家完整名單及臺幣／外幣定義核對，不加入自扣禮。');
set('linebank','Uber Eats／foodpanda外送活動',[group('Uber Eats|foodpanda','direct','須當月登錄；限App外送，不含Uber One或搭車')],'已逐條核對202607delivery活動，商家帳單名稱及請款期限沿用tier。');
set('mcard','機票／訂房網／旅行社／KLOOK／KKDAY／台鐵／客運／計程車／租車',[
  group('Agoda|Booking.com|Hotels.com|Expedia|Trip.com|AsiaYo|易遊網|Airbnb|Klook|KKday|FunNow|萬達通','平台線上即時付款','需電子帳單；平台直接請款，不含現場飯店付款'),
  group('東南旅遊|山富旅遊|五福旅遊|雄獅旅遊|鳳凰旅遊|可樂旅遊|台鐵|國光客運|統聯客運|和欣客運|葛瑪蘭客運|Uber|LINE GO|yoxi|台灣大車隊|大都會計程車|聯邦租車|和運租車|格上租車','direct','需電子帳單；指定交通／旅行服務直接請款'),
  group('航空公司購票|國內飯店住宿','指定MCC直接付款','依銀行認列航空／國內飯店行業代碼，非任意平台請款')
],'指定交通／旅遊完整列舉名單及MCC類別已核。');
set('mcard','國內保費',[group('國內保費','direct','需電子帳單，且未登錄保費分期')],'國內保費類別，不泛配保險品牌或海外保單。');
const aov='App Store|Google Play|Garena|GASH|MyCard|Nintendo|PlayStation|Steam|巴哈姆特|Logitech|NOVA|三創生活園區|寬宏售票|KKTIX|年代售票|拓元售票|Animate|野獸國|POPMART|鼎美玩具|KHTOY|TOYSNAP|東海模型|YouTube Premium|Netflix|Disney+|Twitch|TikTok|愛奇藝|CatchPlay|KKTV|LiTV|Spotify|KKBOX|蝦皮|淘寶|Uber Eats|foodpanda|麥當勞|肯德基|摩斯漢堡|拿坡里|Pizza Hut';
set('dbs-aov','生活玩家精選通路（加碼9%）',[group(aov,'direct','須指定星展帳戶自扣；限指定通路直接請款')],'官方精選通路表完整具名名單；不延伸第三方支付。');
set('dbs-eco','eco 消費 ＋9%',[
 group('Tesla充電|Gogoro電池資費','官方充電／電池資費','不含購車；須帳單顯示指定名稱'),
 group('鮮乳坊|茶籽堂|禾乃川|玩轉學校|直接跟農夫買|綠藤生機|艾瑪絲|覺亞|CILU|甘樂文創|EVOPURE+|臺灣藍鵲茶與石虎米','direct','限指定商家請款，不含LINE Pay、街口與分期')
],'官方列出的支持企業與指定資費；不推定第三方代收適用。');
for(const id of ['dbs-aov','dbs-eco']){
 const r=rows.find(r=>r.cardId===id&&r.label.startsWith('指定地區實體'));
 set(id,r.label,[group('日本實體一般消費|韓國實體一般消費|泰國實體一般消費|新加坡實體一般消費|美洲實體一般消費','指定地區實體外幣','限實體卡／Apple Pay／Samsung Pay；收海外手續費，不含儲值')],'指定地區面對面外幣條件已核；不映射任意品牌。',['歐洲基本回饋排除與加碼的總率差異尚需獨立建模。']);
}
const veg='仙桃素|鈺善閣|祥和蔬食料理|曙光居|毛蔬亞洲蔬食|MIACUCINA|小小樹食|陽明春天|寬心園|養心茶樓|熱浪島南洋蔬食茶堂|原素食府';
set('green','指定綠色消費（加碼5%）',[
 group(veg+'|聖德科斯|里仁|棉花田|台灣主婦聯盟|安永鮮物|Green & Safe|野菜村有機生活館|直接跟農夫買|甘樂文創|鮮乳坊|茶籽堂|AESOP|10/10 HOPE','指定獨立店／官網','需電子帳單；排除百貨店中店，帳單須為指定商家'),
 group('綠藤生機','臺灣官網','限官網直接刷卡'),group("O’right歐萊德",'永康信義體驗店／官網','不含其他店家'),
 group('全國特急電|EVALUE|EVOASIS|Tesla充電|Gogoro電池資費|eMoving電池資費','官方充電／電池資費','限官方App／網站資費，不含購車'),
 group('iRent|GoShare|WeMo Scooter','direct','限共享交通費用'),
 group('臺灣野灣野生動物保育協會|黑潮海洋文教基金會|台灣重新思考環境教育協會|中華民國荒野保護協會|台灣千里步道協會|看見齊柏林基金會|主婦聯盟環境保護基金會','官方捐款','須指定機構直接請款')
],'已讀主頁全部生機選品／蔬食／捐款名單及註2限制，分組避免將購車當充電。');
set('green','生活代扣繳（電信／水電瓦斯／路邊停車）',[group('台電|台北自來水|台灣自來水|大台北瓦斯|欣泰油氣|欣欣天然|新海瓦斯|欣湖天然氣|欣中天然氣|欣桃天然氣|陽明山瓦斯|欣南天然氣|欣雄天然氣|欣高石油氣|中華電信|台灣大哥大|遠傳電信|指定城市路邊停車','銀行自動代扣','需電子帳單；非自行到繳費平台付款；路邊停車限台北、新北、桃園、新竹縣市、台中、台南、高雄')],'官網列舉代扣事業與城市清單，服務名稱查詢不適用商品購買。');
set('green','一卡通綠色大眾運輸（每趟）',[group('一卡通大眾運輸','實體一卡通票證','先註冊iPASS MONEY及綠點；不是直接信用卡購票')],'每趟點數權益獨立顯示，不換算百分比。');
set('breeze','Trine&Zen 崔妮傑恩 免費美式咖啡',[group('Trine&Zen崔妮傑恩微風廣場店|Trine&Zen崔妮傑恩微風中央研究院店','physical','無限卡每日每卡跨館合計一杯')],'官方明列兩店及無限卡每天權益，不混御璽卡週四資格。');
set('breeze','微風影城購票65折',[group('微風影城','physical','限實體卡現場購當日場次，不是所有國賓影城')],'官方微風電影日專屬購票權益。');
set('breeze','微風百貨停車：無限卡免費4小時',[group('微風廣場停車場|微風南京停車場|微風信義停車場|微風松高停車場|微風南山停車場|微風百貨停車','physical','限無限卡、五館停車；每卡每日每車一次')],'沿用先前原始表格逐格核對之無限卡4小時，不使用文字擷取錯位的低卡等門檻。').checkedAt='2026-10-01';
set('breeze','市區停車：每次2小時',[group('聯邦市區停車服務','指定合作停車場','須前月消費達門檻；部分場站不適用，請先確認場站')],'僅權益服務查詢；合作場站依各業者即時清單，不泛配所有同品牌停車場。',['台灣聯通、詮營、ViVi PARK、嘟嘟房、車麻吉的個別場站完整清單未建模。']);
for(const id of ['dbs-aov','dbs-eco']){
 set(id,'星願集刷：每5筆滿888元合格交易加碼',[group(general,'direct','額外加碼非總率；每月登錄、每筆888元且成組5筆，名額依排序')],'一般消費成組活動，以額外權益顯示，不把單筆任意消費列總回饋。');
 set(id,'星饗世界：海外實體餐飲活動',[group('海外實體餐飲','海外實體餐廳','額外加碼非總率；當月登錄，每日最高金額一筆，名額依排序')],'餐飲類別與面對面交易條件，不按任意餐廳品牌推定MCC。');
 set(id,'摘星假期：國旅滿2萬元限量回饋',[
   group('國內飯店住宿','飯店直接住宿付款','額外活動；限臺灣臺幣住宿MCC，不含平台、餐廳及長租'),
   group('立榮航空|華信航空|台灣高鐵|和運租車|iRent|格上租車|中油直營|全國加油|台塑石油加油站|台亞加油站|六福村主題樂園|麗寶樂園|九族文化村|劍湖山世界主題樂園|義大遊樂世界|小人國|遠雄海洋公園|Xpark|國立海生館','官方直接購票／服務','額外活動；月滿2萬、登錄且依金額排名限500名'),
   group('Klook|KKday','國內臺幣請款','額外活動；月滿2萬、登錄且依金額排名限500名')
 ],'完整三大類通路，滿額限量活動不併入總率排名。');
 set(id,'星耀領航：新取得星耀資格之LINE Pay',[group('LINE Pay','LINE Pay','首次星耀資格、維持資產30萬及每月任務／登錄；以LINE Pay請款名稱認列')],'支付服務查詢；不匹配任意合作店直刷。');
}
const travel='Agoda|Hotels.com|Booking.com|樂天旅遊|Airbnb|KKday|Klook|Trip.com|聯邦X肯驛線上旅遊商城|易遊網|易飛網|雄獅旅遊|可樂旅遊|東南旅遊|鳳凰旅遊|大興旅遊|五福旅遊|山富旅遊|太平洋旅遊|世邦旅遊|良友旅遊|長汎旅遊|信安旅遊|百威旅遊|理想旅遊|燦星旅遊|加利利旅行社|清晨旅行社|暢遊旅行|飛揚旅行社|凱旋旅行社|巨大旅遊|典華旅行社|誠翔運通旅行社|賓士旅行社|華友旅行社|旅天下直營|利百加旅遊|世興旅行社|旅遊家旅行社';
for(const id of ['linebank','breeze','mcard','jihe','green'])set(id,'第四季指定旅遊滿額禮（最高9,500元）',[
 group(travel,'平台／旅行社直接付款','全行共用，須登錄與月滿額；搜尋不計分期加碼，最高9,500含另有分期條件'),
 group('航空公司購票|飯店住宿','指定MCC直接付款','須登錄與滿額；以官方航空／飯店MCC認列，不泛配任意商家')
],'完整官方指定旅遊及旅行社清單；多門檻刷卡金獨立權益不換算固定百分比。');
set('jihe','日幣消費（基本）',[group('日本一般消費','direct','限日幣一般消費，不含分期與排除項目')],'日幣一般消費服務查詢，不推定國際品牌交易幣別。');
set('jihe','日本實體 Apple/Google Pay 感應（需登錄）',[group('日本實體一般消費','日本Apple／Google Pay感應','需登錄，單筆臺幣100元；不含交通、網路或QUICPay')],'官方日本行動支付條款明列感應及排除。');
set('jihe','前月帳單滿3萬 升級加碼',[group('日本實體一般消費','日本Apple／Google Pay感應','需登錄、前月帳單滿3萬及單筆100元；不含交通、網路、QUICPay')],'前月帳單條件不是當月消費門檻，不作無條件日本回饋。');
set('jihe','日本熱門商店（疊加天花板）',[group('7-ELEVEN|全家|LAWSON|東京迪士尼樂園|大阪環球影城|永旺|三越|高島屋|BicCamera|Yodobashi|唐吉訶德','日本Apple／Google Pay感應','最高率須登錄＋前月帳單滿3萬；限日本日幣實體，不含樂園網路票／飯店')],'官方11店清單；只有滿足行動支付疊加條件時顯示原8%層。');
set('jihe','日本三大交通卡儲值',[group('Suica|PASMO|ICOCA','日本交通卡日幣儲值','需當月登錄；不加日幣基本回饋')],'三交通卡儲值獨立規則，不視為日本一般消費。');
set('jihe','新戶日本實體消費加碼',[group('日本實體一般消費','日本實體（日圓）','額外加碼非總率；活動內申辦核卡新戶，不含網路及交通')],'新戶權益以額外活動列示，沿用新戶篩選。');
set('jihe','國內日系名店加碼（+4%）',[
 group('思夢樂|GLOBAL WORK|niko and …|LOWRYS FARM|LAKOLE|studio CLIP|repipi armario|HARE|Heather|PAGEBOY|RAGEBLUE|LEPSIM|JEANASIS|DAISO大創百貨|Standard Products|THREEPPY|日藥本舖|松本清|Tomod’s|札幌藥妝|TSUTAYA BOOKSTORE','臺灣指定實體門市','不含日藥本舖百貨／店中店及大創店中店；不含第三方支付'),
 group('UNIQLO|GU','臺灣官網','限品牌網路商店直接刷卡'),
 group('UNIQLO|GU','臺灣指定實體門市','UNIQLO限直營／列名商場，GU限官方列名10店；非所有百貨門市')
],'已核官方23品牌及門市例外；UNIQLO／GU須指定門市。',['UNIQLO／GU逐分店名稱尚未展開，僅指定門市渠道提示。']);
set('green','iPASS MONEY餘額繳聯邦卡費',[group('iPASS MONEY繳聯邦卡費','iPASS MONEY帳戶餘額','須綁卡並同意綠點；不是消費再加碼')],'僅繳卡費服務，避免誤套一般消費。');
for(const r of rows)if(r.end&&r.end<'2026-10-21'&&r.status==='unresolved'&&!r.label.includes('續行待確認')){r.status='expired';r.reason='本層已過期，未套用其他活動的續期；不參與搜尋推薦。';}
for(const r of rows)if(r.label.includes('Mastercard'))r.reason='Mastercard個別商戶完整優惠與啟用條件位於登入後頁面；未取得授權資料，不猜測最高率適用所有商家。';
for(const r of rows.filter(r=>['dbs-aov','dbs-eco'].includes(r.cardId)))for(const g of [...(r.rules||[])]){
  if(g.merchants.includes('日本實體一般消費')&&g.channels.includes('指定地區實體外幣')){
    g.merchants=g.merchants.filter(n=>n!=='日本實體一般消費');
    r.rules.push(group('日本實體一般消費','physical','限日本實體卡／Apple Pay／Samsung Pay外幣面對面消費且收海外手續費；不含網購與儲值'));
  }
}
fs.writeFileSync(path.join(root,'research/search-ubot-dbs.json'),JSON.stringify(rows.map(normalized),null,2)+'\n');
