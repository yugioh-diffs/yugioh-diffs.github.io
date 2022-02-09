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

let DOWNLOAD = ((name, url) =>
{
    const e = document.createElement('a');
    e.href = url;
    e.download = name;
    e.click();
});

let LOG = ((m) =>
{
    const e = document.getElementById('log');
    e.innerText = (m + '\n' + e.innerText);
});

document.addEventListener('DOMContentLoaded', () =>
{
    let locked = false;
    let imageQueue = null;
    let jsonFile = null;
    document.getElementById('img').disabled = true;
    document.getElementById('json').disabled = true;
    document.getElementById('restart').addEventListener('click', async function()
    {
        if (locked)
            return;

        this.disabled = true;
        locked = true;
        try
        {
            document.getElementById('log').innerText = 'Starting...';
            imageQueue = [];
            jsonFile = null;
            document.getElementById('img').disabled = true;
            document.getElementById('json').disabled = true;
            
            const artworkManifest = await (await fetch('https://artworks.db.ygorganization.com/manifest.json', {cache: 'reload'})).json();

            const data = await (await fetch('entries.json', {cache: 'reload'})).json();
            LOG('Loaded '+data.length+' entries from existing entries.json');
            
            const now = new Date();
            const hasChanges = (await Promise.all(data.map(async (entry) =>
            {
                try
                {
                    let changed = false;
                    const dbEntry = await (await fetch('https://db.ygorganization.com/data/card/'+entry.id)).json();
                    if (dbEntry.cardData.en.id !== entry.id)
                    {
                        LOG('Adjusted canonical ID: ' + entry.id + ' -> ' + dbEntry.cardData.en.id);
                        entry.id = dbEntry.cardData.en.id;
                        changed = true;
                    }
                    
                    if (!(await fetch('artwork/'+entry.id+'.png', {method: 'HEAD'})).ok)
                    {
                        LOG('Getting artwork for: #'+entry.id);
                        const img = new Image();
                        for (const artworkId in artworkManifest.cards[entry.id])
                        {
                            const artworkData = artworkManifest.cards[entry.id][artworkId]
                            img.src = ('https://artworks.db.ygorganization.com' + (artworkData.bestTCG || artworkData.bestOCG));
                            break;
                        }
                        await img.decode();
                        const canvas = document.createElement('canvas');
                        canvas.width = img.width;
                        canvas.height = img.height*(150/290);
                        const ctx = canvas.getContext('2d');
                        ctx.drawImage(img, 0, img.height*(30/290), canvas.width, canvas.height, 0, 0, canvas.width, canvas.height);
                        
                        imageQueue.push([entry.id, canvas]);
                        document.getElementById('img').disabled = false;
                    }
                    
                    if (entry.name !== dbEntry.cardData.en.name)
                    {
                        LOG('Adjusted card name for #'+entry.id+': '+entry.name+' -> '+dbEntry.cardData.en.name);
                        entry.name = dbEntry.cardData.en.name;
                        changed = true;
                    }
                    
                    if (!('lastUpdated' in entry))
                    {
                        entry.lastUpdated = entry.date;
                        delete entry.date;
                        changed = true;
                    }
                    
                    const dbDate = dbEntry.cardData.en.thisSrc.date;
                    if ((entry.lastPrint < dbDate) && ((new Date(dbDate)) <= now))
                    {
                        LOG('Adjusted last-printed date for '+entry.name+': ' + entry.lastPrint + ' -> '+dbDate);
                        entry.lastPrint = dbDate;
                        changed = true;
                    }
                    
                    const shouldBeIcon = selectIcon(dbEntry.cardData.en);
                    if (entry.icon !== shouldBeIcon)
                    {
                        LOG('Adjusted icon for '+entry.name+': '+entry.icon+' -> '+shouldBeIcon);
                        entry.icon = shouldBeIcon;
                        changed = true;
                    }
                    
                    if (
                      (entry.oldText !== dbEntry.cardData.en.effectText) &&
                      (entry.oldText !== dbEntry.cardData.en.pendulumEffectText)
                    )
                    {
                        LOG('Adjusted oldtext for '+entry.name+' to match its current effect text. (Make sure this is correct!)');
                        entry.oldText = dbEntry.cardData.en.effectText;
                        changed = true;
                    }
                    
                    if ((entry.icon !== 'spell') && (entry.icon !== 'trap') && entry.newText.toLowerCase().includes('during either player\'s turn'))
                        LOG(entry.name+' ('+entry.id+') uses "during either player\'s turn" in its revised text. Is this intended?');
                    if (entry.newText.toLowerCase().includes('graveyard'))
                        LOG(entry.name+' ('+entry.id+') uses "graveyard" in its revised text. Is this intended?');
                    if (entry.newText.toLowerCase().includes('xyz material'))
                        LOG(entry.name+' ('+entry.id+') uses "Xyz Material" in its revised text. Is this intended?');
                    if (entry.newText.toLowerCase().includes('attacks or is attacked'))
                        LOG(entry.name+' ('+entry.id+') uses "attacks or is attacked" in its revised text. Is this intended?');
                    if (entry.newText.toLowerCase().includes('attacked or was attacked'))
                        LOG(entry.name+' ('+entry.id+') uses "attacked or was attacked" in its revised text. Is this intended?');
                    if (entry.newText.toLowerCase().includes('atk and def'))
                        LOG(entry.name+' ('+entry.id+') uses "ATK and DEF" in its revised text. Is this intended?');
                    if (entry.newText.toLowerCase().includes('-type'))
                        LOG(entry.name+' ('+entry.id+') uses "-type" in its revised text. Is this intended?');
                    
                    return changed;
                } catch (e) {
                    console.warn(e,entry);
                    LOG('Failed validating '+entry.id+' ('+e+')');
                    return false;
                }
            }))).some(o => o);
            
            if (hasChanges)
            {
                LOG('Done processing. Offering json file for download.');
                jsonFile = JSON.stringify(data, null, 2);
                if (!jsonFile.endsWith('\n'))
                    jsonFile += '\n';
                document.getElementById('json').disabled = false;
            }
            else
            {
                LOG('Done processing. No changes.');
                jsonFile = null;
                document.getElementById('json').disabled = true;
            }
        }
        catch (e)
        {
            console.error(e);
            LOG('Failed ('+e+')');
        }
        finally
        {
            locked = false;
            this.disabled = false;
        }
    });
    
    document.getElementById('img').addEventListener('click', function ()
    {
        if (!imageQueue || !imageQueue.length)
        {
            imageQueue = null;
            this.disabled = true;
            return;
        }
        const [id, canvas] = imageQueue.pop();
        const ct = document.getElementById('img-container');
        while (ct.lastChild) ct.removeChild(ct.lastChild);
        navigator.clipboard.writeText(id+'.png');
        ct.appendChild(document.createTextNode(id+'.png:'));
        ct.appendChild(canvas);
        if (imageQueue.length)
            LOG('Offering artwork for '+id+', '+imageQueue.length+' to go.');
        else
        {
            LOG('Offering artwork for '+id+', you are done.');
            imageQueue = null;
            this.disabled = true;
        }
    });
    
    document.getElementById('json').addEventListener('click', function ()
    {
        if (!jsonFile)
        {
            this.disabled = true;
            return;
        }
        DOWNLOAD('entries.json', 'data:text/plain;charset=utf-8,'+encodeURIComponent(jsonFile));
        LOG('Offering entries.json for download.');
    });
});
