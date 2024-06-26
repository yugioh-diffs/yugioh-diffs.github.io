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

let existingEntryIdx = (async () =>
{
    const idx = {};
    for (const entry of await (await fetch('entries.json')).json())
        idx[entry.id] = entry;
    return idx;
})();

let regenerateJSON = (() =>
{
    const oldChildren = Array.from(document.getElementById('old-text').children);
    const newChildren = Array.from(document.getElementById('new-text').children);
    
    let data = [[0,0]];
    for (const [id, cls, idx] of [['old-text','deletion-word',0],['new-text','addition-word',1]])
    {
        let i = 0;
        let state = false;
        for (const elm of document.getElementById(id).children)
        {
            const has = elm.classList.contains(cls);
            if (has !== state)
            {
                state = has;
                ++i;
                
                if (i === data.length)
                    data.push([0,0]);
            }
            ++data[i][idx];
        }
    }
    for (let i=0; i<data.length; ++i)
    {
        if (data[i][0] === data[i][1])
            data[i] = data[i][0];
    }
    document.getElementById('output-json').value = (
                         '    "customDiffData": [\n' +
        data.map((e) => ('      '+JSON.stringify(e))).join(',\n') +
                       '\n    ]'
    );
});

const isIn = ((elmChild, range) =>
{
    const cmpRange = new Range();
    cmpRange.selectNodeContents(elmChild);
    return ((range.compareBoundaryPoints(Range.START_TO_START, cmpRange) <= 0) && (range.compareBoundaryPoints(Range.END_TO_END, cmpRange) >= 0));
});

document.getElementById('diff-on').addEventListener('click', () =>
{
    const sel = window.getSelection();
    if (!sel) return;
    for (let i=0, n=sel.rangeCount; i<n; ++i)
    {
        const range = sel.getRangeAt(i);
        for (const elm of document.getElementById('old-text').children)
            if (isIn(elm.firstChild, range))
                elm.classList.add('deletion-word');
        for (const elm of document.getElementById('new-text').children)
            if (isIn(elm.firstChild, range))
                elm.classList.add('addition-word');
    }
    sel.removeAllRanges();
    
    regenerateJSON();
});

document.getElementById('diff-off').addEventListener('click', () =>
{
    const sel = window.getSelection();
    if (!sel) return;
    for (let i=0, n=sel.rangeCount; i<n; ++i)
    {
        const range = sel.getRangeAt(i);
        for (const elm of document.getElementById('old-text').children)
            if (isIn(elm.firstChild, range))
                elm.classList.remove('deletion-word');
        for (const elm of document.getElementById('new-text').children)
            if (isIn(elm.firstChild, range))
                elm.classList.remove('addition-word');
    }
    sel.removeAllRanges();
    
    regenerateJSON();
});

document.getElementById('diff-clear').addEventListener('click', () =>
{
    for (const elm of document.getElementById('old-text').children)
        elm.classList.remove('deletion-word');
    for (const elm of document.getElementById('new-text').children)
        elm.classList.remove('addition-word');
    regenerateJSON();
});

document.getElementById('card-id').addEventListener('input', function()
{
    let v = this.value;
    if (v.startsWith('https://db.ygoresources.com/card#'))
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
    const id = parseInt(this.value);
    if (isNaN(id))
    {
        document.body.classList.remove('has-id');
        return;
    }
    
    const data = (await existingEntryIdx)[id];
    if (!data)
    {
        document.body.classList.remove('has-id');
        return;
    }
    
    const oldContainer = document.getElementById('old-text');
    const newContainer = document.getElementById('new-text');
    removeAllChildren(oldContainer);
    removeAllChildren(newContainer);

    const oldText = data.oldText;
    const newText = data.newText;
    if (data.customDiffData)
    {
        let posOld = 0, posNew = 0, isDiff = false;
        for (let entry of data.customDiffData)
        {
            if (typeof(entry) === "number")
                entry = [entry, entry];
            const [numOld, numNew] = entry;
            
            for (let i=0; i<numOld; ++i, ++posOld)
                if (posOld < oldText.length)
                    makeElement('span', oldContainer, isDiff && 'deletion-word').innerText = oldText.substr(posOld, 1);
                
            for (let i=0; i<numNew; ++i, ++posNew)
                if (posNew < newText.length)
                    makeElement('span', newContainer, isDiff && 'addition-word').innerText = newText.substr(posNew, 1);

            isDiff = !isDiff;
        }
        
        // force rendering the entire text even for broken entries
        for (; posOld < oldText.length; ++posOld)
            makeElement('span', oldContainer).innerText = oldText.substr(posOld, 1);
        for (; posNew < newText.length; ++posNew)
            makeElement('span', newContainer).innerText = newText.substr(posNew, 1);
    }
    else
    {
        const diffResult = window.diff(oldText, newText);
        for (const [whose, part] of diffResult)
        {
            for (const ch of part.split(''))
            {
                if (whose < 0)
                    makeElement('span', oldContainer, 'deletion-word').innerText = ch;
                else if (whose > 0)
                    makeElement('span', newContainer, 'addition-word').innerText = ch;
                else
                {
                    makeElement('span', oldContainer, null).innerText = ch;
                    makeElement('span', newContainer, null).innerText = ch;
                }
            }
        }
    }
    
    regenerateJSON();
    document.body.classList.add('has-id');
});
