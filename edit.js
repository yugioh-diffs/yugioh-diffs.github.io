let makeElement = ((type, parnt, cls) =>
{
    const e = document.createElement(type);
    if (parnt)
        parnt.appendChild(e);
    if (cls)
        e.className = cls;
    return e;
});

let removeAllChildren = ((e) => { while (e.lastChild) e.removeChild(e.lastChild); });

let selectIcon = ((cardData) =>
{
    if (cardData.cardType !== 'monster')
        return cardData.cardType;
    const prefix = (cardData.properties.includes(16) ? 'pen_' : '');
    if (cardData.properties.includes(23))
        return (prefix + 'link');
    if (cardData.properties.includes(18))
        return (prefix + 'xyz');
    if (cardData.properties.includes(19))
        return (prefix + 'synchro');
    if (cardData.properties.includes(11))
        return (prefix + 'fusion');
    if (cardData.properties.includes(27))
        return (prefix + 'ritual');
    if (cardData.properties.includes(4))
        return (prefix + 'effect');
    return (prefix + 'normal');
});

let loadText = ((oldContainer, newContainer, oldText, newText) =>
{
    removeAllChildren(oldContainer);
    removeAllChildren(newContainer);
    const diffResult = window.diff(oldText, newText);
    for (const [whose, part] of diffResult)
    {
        if (whose < 0)
            makeElement('span', oldContainer, 'deletion-word').innerText = part;
        else if (whose > 0)
            makeElement('span', newContainer, 'addition-word').innerText = part;
        else
        {
            oldContainer.appendChild(document.createTextNode(part));
            newContainer.appendChild(document.createTextNode(part));
        }
    }
});

let existingEntryIdx = (async () =>
{
    const idx = {};
    for (const entry of await (await fetch('entries.json')).json())
        idx[entry.id] = entry;
    return idx;
})();

document.addEventListener('DOMContentLoaded', () =>
{
    document.getElementById('card-id').addEventListener('input', function()
    {
        let v = this.value;
        if (v.startsWith('https://db.ygorganization.com/card#'))
        {
            if (v.charAt(v.length-3) === ':')
                this.value = v.substring(35, v.length-3);
            else
                this.value = v.substring(35);
            this.blur();
        }
        else if (v.startsWith('https://texts.ygoresources.com/#'))
        {
            this.value = v.substring(32);
            this.blur();
        }
    });
    document.getElementById('card-id').addEventListener('change', async function()
    {
        if (document.getElementById('new-text').value) return;
        const id = parseInt(document.getElementById('card-id').value);
        if (isNaN(id)) return;
        const existing = (await existingEntryIdx)[id];
        if (document.getElementById('new-text').value) return;
        if (existing)
        {
            document.getElementById('new-text').value = existing.newText;
            document.getElementById('date').value = '';
            for (let i=1; i<4; ++i)
            {
                const ref = existing.references[i-1];
                if (ref)
                {
                    document.getElementById('ref-'+i+'-url').value = ref.url;
                    document.getElementById('ref-'+i+'-title').value = ref.title;
                    document.getElementById('ref-'+i+'-date').value = ref.date;
                    document.getElementById('ref-'+i+'-desc').value = ref.desc;
                }
                else
                {
                    document.getElementById('ref-'+i+'-url').value = '';
                    document.getElementById('ref-'+i+'-title').value = '';
                    document.getElementById('ref-'+i+'-date').value = '';
                    document.getElementById('ref-'+i+'-desc').value = '';
                }
            }
        }
        else
        {
            let dbText = null;
            try
            {
                dbText = (await (await fetch('https://db.ygorganization.com/data/card/'+id)).json()).cardData.en.effectText;
            } catch (f) { console.error(f); dbText = 'OrgDB query failed:\n'+f; }
            if (document.getElementById('new-text').value) return;
            
            document.getElementById('new-text').value = dbText;
            document.getElementById('date').value = '';
            for (let i=1; i<4; ++i)
            {
                document.getElementById('ref-'+i+'-url').value = '';
                document.getElementById('ref-'+i+'-title').value = '';
                document.getElementById('ref-'+i+'-date').value = '';
                document.getElementById('ref-'+i+'-desc').value = '';
            }
        }
        document.getElementById('output').className = '';
    });
    document.getElementById('author').value = (window.localStorage.getItem('savedAuthorName') || '');
    for (let i=1; i<4; ++i)
    {
        document.getElementById('ref-'+i+'-url').addEventListener('input', async function ()
        {
            try
            {
                let v = this.value;
                if (v.startsWith('https://db.ygorganization.com/card#'))
                {
                    const cid = parseInt(v.substr(35));
                    if (isNaN(cid))
                        return;
                    if (v.charAt(v.length-3) === ':')
                        this.value = ('https://www.db.yugioh-card.com/yugiohdb/card_search.action?ope=2&cid=' + cid + '&request_locale=' + v.substr(v.length-2));
                    else
                        this.value = ('https://www.db.yugioh-card.com/yugiohdb/faq_search.action?ope=4&cid=' + cid + '&request_locale=ja');
                }
                else if (v.startsWith('https://db.ygorganization.com/qa#'))
                {
                    const fid = parseInt(v.substr(33));
                    if (isNaN(fid))
                        return;
                    this.value = ('https://www.db.yugioh-card.com/yugiohdb/faq_search.action?ope=5&fid=' + fid + '&request_locale=ja');
                }
                v = this.value;
                if (!v.startsWith('https://www.db.yugioh-card.com/'))
                    return;
                const e = document.getElementById('ref-'+i+'-title');
                if (e.value)
                    return;
                const cidx = v.indexOf('&cid=');
                if (cidx >= 0)
                {
                    const cid = parseInt(v.substr(cidx+5));
                    if (isNaN(cid))
                        return;
                    const dat = await (await fetch('https://db.ygorganization.com/data/card/'+cid)).json();
                    if (v !== this.value)
                        return;
                    if (e.value)
                        return;
                    if (v.indexOf('ope=4') >= 0)
                        e.value = ('Card FAQ – '+dat.cardData.en.name);
                    else
                        e.value = dat.cardData.en.name;
                    return;
                }
                const fidx = v.indexOf('&fid=');
                if (fidx >= 0)
                {
                    const fid = parseInt(v.substr(fidx+5));
                    if (isNaN(fid))
                        return;
                    e.value = ('Q&A #'+fid);
                }
            } catch (e) { console.log(this.value); console.log(e); }
        });
    }
    
    let locked = false;
    document.getElementById('clear').addEventListener('click', (e) =>
    {
        if (!e.shiftKey)
        {
            window.alert('Needs shift held down');
            return;
        }
        document.getElementById('card-id').value = '';
        document.getElementById('new-text').value = '';
        // document.getElementById('author').value = '';
        document.getElementById('date').value = '';
        for (let i=1; i<4; ++i)
        {
            document.getElementById('ref-'+i+'-url').value = '';
            document.getElementById('ref-'+i+'-title').value = '';
            document.getElementById('ref-'+i+'-date').value = '';
            document.getElementById('ref-'+i+'-desc').value = '';
        }
        document.getElementById('output').className = '';
    });
    document.getElementById('preview').addEventListener('click', async (e) =>
    {
        if (locked)
        {
            window.alert('Already working - don\'t mash me.');
            return;
        }
        locked = true;
        try
        {
            try
            {
                let id = document.getElementById('card-id').value.trim();
                if (!id)
                    throw 'Card ID missing';
                id = parseInt(id);
                if (isNaN(id))
                    throw 'Invalid Card ID';
                
                let newText = document.getElementById('new-text').value.trim();
                if (!newText)
                    throw 'Revised text missing';
                
                let author = document.getElementById('author').value.trim();
                if (!author)
                    throw 'Author missing';
                window.localStorage.setItem('savedAuthorName', author);
                
                let date = document.getElementById('date').value.trim();
                if (!date)
                {
                    const s = new Date().toISOString();
                    date = s.substr(0,s.indexOf('T'));
                }
                try { new Date(date); } catch (v) { throw 'Invalid date'; }
                
                let references = [];
                for (let i=1; i<4; ++i)
                {
                    let url = document.getElementById('ref-'+i+'-url').value.trim();
                    if (!url)
                        continue;
                    try { new URL(url); } catch (v) { throw ('Invalid URL for ref '+i); }
                    
                    let title = document.getElementById('ref-'+i+'-title').value.trim();
                    if (!title)
                        throw ('Missing title for ref '+i);
                    
                    let date = document.getElementById('ref-'+i+'-date').value.trim();
                    if (!date)
                    {
                        const s = new Date().toISOString();
                        date = s.substr(0,s.indexOf('T'));
                    }
                    try { new Date(date); } catch (v) { throw ('Invalid date for ref '+i); }
                    
                    let desc = document.getElementById('ref-'+i+'-desc').value.trim();
                    if (!desc)
                        throw ('Missing description for ref '+i);
                    
                    references.push({
                        'url': url,
                        'title': title,
                        'date': date,
                        'desc': desc
                    });
                }
                
                let dbEntry = null;
                try
                {
                    dbEntry = await (await fetch('https://db.ygorganization.com/data/card/'+id)).json();
                } catch (f) { console.error(f); throw 'Failed to get data from YGOrg DB'; }
                
                const data = {
                    'id': id,
                    'icon': selectIcon(dbEntry.cardData.en),
                    'name': dbEntry.cardData.en.name,
                    'oldText': dbEntry.cardData.en.effectText,
                    'newText': newText,
                    'author': author,
                    'lastPrint': dbEntry.cardData.en.thisSrc.date,
                    'lastUpdated': date,
                    'references': references
                };
                document.getElementById('output-json').value = JSON.stringify([data], null, 2);
                loadText(document.getElementById('preview-old-text'), document.getElementById('preview-new-text'), data.oldText, data.newText);
                document.getElementById('output').className = 'has-output';
            }
            catch (e)
            {
                document.getElementById('output').className = 'has-error';
                console.error(e);
                document.getElementById('output-error').innerText = (''+e);
            }
        } finally { locked = false; }
    });
});
