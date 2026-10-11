"""Real Chrome + official Agent smoke; fixture decisions, no paid model calls."""
import os
import subprocess
import sys
import urllib.request

from jev_worker.runtime import browser_runtime

SCRIPT = r'''
from urllib.parse import quote
from jev_ultrafast import Agent
import jev_ultrafast.agent as implementation

def choose(page, goal, history):
    action = next((a for a in page['actions'] if a['kind'] == 'click'), None)
    choice = action['id'] if not history and action else 'DONE'
    return {'choice': choice, 'probabilities': {choice: 1}, 'confidence': 1,
            'latency_ms': 0, 'operation': 'CLICK' if choice != 'DONE' else 'DONE',
            'target': None, 'usage': {}}
implementation.choose = choose
html = '<button onclick="document.body.innerHTML=\'Model ABC-123. Capacity: 50 gallons\'">Specifications</button>'
with Agent('data:text/html,' + quote(html), 'Open specifications') as agent:
    states = list(agent.run())
    assert states[-1]['status'] == 'done'
    assert '50 gallons' in agent.browser.evaluate('document.body.innerText')
    assert len(states[-1]['history']) == 1
    arguments = agent.browser.call('Browser.getBrowserCommandLine')['arguments']
    assert '--proxy-bypass-list=<-loopback>' in arguments
    assert '--remote-debugging-address=127.0.0.1' in arguments
    blocked = agent.browser.call('Page.navigate', url='https://127.0.0.1:9222/json')
    assert blocked.get('errorText'), blocked
print('PASS official Agent API, actual Chrome click/read, proxy blocks loopback navigation')
'''

if __name__ == '__main__':
    os.environ.setdefault('JEV_CHROME_PATH', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome')
    with browser_runtime({'hosts': ['www.rheem.com']}) as env:
        subprocess.run([sys.executable, '-c', SCRIPT], env=env, check=True, timeout=30)
    try:
        urllib.request.urlopen(env['BU_CDP_URL'] + '/json/version', timeout=1)
        raise AssertionError('Chrome survived cleanup')
    except OSError:
        pass
    print('PASS owned browser and harness cleanup')
    try:
        with browser_runtime({'hosts': ['www.rheem.com']}) as timeout_env:
            subprocess.run([sys.executable, '-c', 'import time; time.sleep(60)'], timeout=0.1, env=timeout_env)
    except subprocess.TimeoutExpired:
        pass
    else:
        raise AssertionError('Timeout did not fire')
    try:
        urllib.request.urlopen(timeout_env['BU_CDP_URL'] + '/json/version', timeout=1)
        raise AssertionError('Chrome survived timeout cleanup')
    except OSError:
        pass
    print('PASS subprocess timeout closes the browser')
