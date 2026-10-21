# 日本／韓國／美國搜尋檢查

日期：2026-10-22。全23張卡都檢視了既有優惠層及搜尋規則，不等於23家銀行所有新活動已重新查完。數字為條件成立時原優惠層的總率；上限、任務、新戶、有效期仍由原層控制。

## 根因與修正

- 「國家實體一般消費」原本沒有連到「該國一般消費／國外一般消費／國外實體一般消費」，導致跨卡漏列。只對日本、韓國、美國這三個明確查詢建立父類關係，不向任意商家泛用。
- 原本用直接刷卡／指定地區外幣等不同文字表達同類交易，Unicard及星展改成可比較的國家實體規則。
- 指定商店、交通卡與支付方式不是全國通用：COUNTRY_SPECIALS只引用卡片id與原優惠層名稱，不複製回饋率，分區顯示，並保留searchGroups的渠道與限制。
- 額外加碼與權益不進總率排名；哩程維持元／哩。
- 中信LINE Pay日韓美不再被尚未查全的歐洲排除清單一併封鎖；其他國家仍保留缺口。

## 逐卡結果

| 卡片 | 日本一般 | 韓國一般 | 美國一般 | 額外注意 |
|---|---:|---:|---:|---|
| 中信101 | 1.2% | 1.2% | 1.2% | 原上限待確認 |
| Unicard | 4.5% | 4.5% | 4.5% | UP選、帳單e化及自扣 |
| DAWHO | 6% | 6% | 6% | 大戶Plus及任務；不是一般大戶 |
| SPORT | 2% | 2% | 2% | 運動條件，其他支付加碼仍待確認 |
| Richart | 3.3% | 3.3% | 3.3% | 玩旅刷／LEVEL2 |
| CUBE | 3.5% | 3% | 3% | 日本秋日遊；其餘趣旅行，指定店另區 |
| 星展傳說對決 | 5% | 5% | 5% | 外幣面對面、自扣等原條件 |
| 星展eco | 5% | 5% | 5% | 外幣面對面，儲值除外 |
| LINE Bank | 2.5% | 2.5% | 2.5% | 外幣一般消費 |
| 微風無限 | 未建立 | 未建立 | 未建立 | 現有停車／館內權益不適用；舊刷卡金續行仍待查 |
| M卡 | 3% | 3% | 3% | 電子化帳單 |
| 吉鶴 | 2.5% | 未建立 | 未建立 | 日幣基本；行動支付4／5%、指定店8%另列 |
| 綠卡 | 2% | 2% | 2% | 電子化帳單，補原本只寫在sub的海外率 |
| 好市多 | 5% | 5% | 5% | 限量月登錄、外幣實體、與旅遊加碼共用上限 |
| 富邦J | 6% | 6% | 未建立 | 當季登錄、單筆1,000元；交通卡10%另列 |
| U Bear | 1% | 1% | 1% | 帳單e化及自扣，非網購加碼3% |
| Pi | 3% | 3% | 3% | 月消費3萬元及登錄 |
| 熊本熊 | 2.5% | 未建立 | 未建立 | 指定日本商店8.5%、Wallet PayPay3.5%另列 |
| 匯豐旅人 | 10元/哩 | 10元/哩 | 10元/哩 | 海外交易手續費等原條件 |
| 中信華航 | 9元/哩 | 9元/哩 | 9元/哩 | 生日6元/哩另列 |
| 國泰長榮 | 10元/哩 | 10元/哩 | 10元/哩 | 海外實體；年度共用上限 |
| 玉山星宇 | 10元/哩 | 10元/哩 | 10元/哩 | 全額年費；生日5元/哩另列 |
| 中信LINE Pay | 5% | 5% | 5% | Q4限量登錄；原2.8%層仍保留 |

「未建立」不是「零回饋」：吉鶴／熊本熊非日本及J卡美國的基本消費資料仍待補查，不把國內率或日本率直接套用。這些低率缺口不應被測試null解釋成銀行沒有優惠。

## 本次官方重讀入口

- https://event.esunbank.com.tw/credit/kumamon-card/japan-discount.html
- https://activity.ubot.com.tw/2026JiHoCard/japan.htm
- https://event.esunbank.com.tw/credit/unicard/discount-channel.html
- https://www.dbs.com.tw/personal-zh/cards/dbs_eco/index.html
- https://www.fubon.com/banking/Personal/credit_card/all_card/Costco/costco.htm
- https://www.cathaybk.com.tw/cathaybk/promo/event/credit-card/product/japanrewards/index.html
- https://www.cathaybk.com.tw/cathaybk/personal/credit-card/cards/intro/eva/login/
- https://www.ctbcbank.com/content/dam/minisite/long/creditcard/CTBCCI/index.html
- https://www.ctbcbank.com/content/dam/minisite/long/creditcard/LINEPay/notice.html
- https://www.ctbcbank.com/content/dam/minisite/long/creditcard/LINEPay/page_travel.html
- https://activity.ubot.com.tw/2026GreenCard/index.htm
- https://event.esunbank.com.tw/credit/ubear/index.html

## 驗收範圍

23卡×3國固定矩陣、指定店不當一般回饋、未知商家不套國外率、網購排除、選卡／新戶／過期條件、哩程單位，並加入三國切換的瀏覽器操作回歸。獨立審查指出條件區漏掉規則組渠道，已補渠道與qualifier及回歸測試。
